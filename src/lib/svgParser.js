import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import * as THREE from 'three';

/**
 * Sanitizes SVG text: converts scientific notation floats to decimal strings
 * to prevent SVG path parser failures.
 */
function sanitizeSvgText(svgText) {
  return svgText.replace(/([+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+)/g, match => {
    const val = Number(match);
    if (isNaN(val)) return match;
    return val.toFixed(10).replace(/\.?0+$/, '') || '0';
  });
}

/**
 * Validates SVG content and returns warnings array.
 * Throws if the SVG has no usable path data.
 */
function validateSvg(domDoc) {
  const warnings = [];

  const textElements = domDoc.querySelectorAll('text, tspan');
  if (textElements.length > 0) {
    warnings.push(
      'Text elements found. Text must be converted to outlines. In Inkscape: select text → Path → Object to Path.'
    );
  }

  const pathElements = domDoc.querySelectorAll('path, polygon, rect, circle, ellipse, polyline, line');
  if (pathElements.length === 0) {
    throw new Error('No vector path elements found in SVG. Please ensure your SVG contains <path> elements.');
  }

  return warnings;
}

/**
 * Computes the bounding box of all points across an array of THREE.Shape objects.
 */
function computeShapesBoundingBox(shapes) {
  const box = new THREE.Box2();
  for (const shape of shapes) {
    const pts = shape.getPoints(64);
    for (const p of pts) box.expandByPoint(p);
  }
  return box;
}

/**
 * Applies a uniform scale + translation to all shapes so they fit within
 * targetW × targetH, centered at origin.
 * Also flips Y (SVG Y-down → Three.js Y-up) and mirrors X for die alignment.
 */
function normalizeShapes(shapes, targetW, targetH) {
  const box = computeShapesBoundingBox(shapes);
  const size = new THREE.Vector2();
  box.getSize(size);
  const center = new THREE.Vector2();
  box.getCenter(center);

  if (size.x === 0 || size.y === 0) return shapes;

  const scaleX = targetW / size.x;
  const scaleY = targetH / size.y;
  const scale = Math.min(scaleX, scaleY);

  function transformPoint(p) {
    // Center → scale → mirror X
    return new THREE.Vector2(
      -(p.x - center.x) * scale,
      -(p.y - center.y) * scale  // negate Y: SVG Y-down → Y-up
    );
  }

  function transformShape(shape) {
    const newShape = new THREE.Shape();
    const outerPts = shape.getPoints(64).map(transformPoint);
    newShape.setFromPoints(outerPts);
    newShape.holes = shape.holes.map(hole => {
      const newHole = new THREE.Path();
      newHole.setFromPoints(hole.getPoints(64).map(transformPoint));
      return newHole;
    });
    return newShape;
  }

  return shapes.map(transformShape);
}

/**
 * Parses an SVG file (provided as text string) and returns normalized THREE.Shape
 * objects ready for geometry building.
 *
 * @param {string} svgText - Raw SVG file contents
 * @param {object} params - Geometry parameters (plateWidth, plateHeight, designScale)
 * @param {boolean} fixWindingOrder - If true, use reversed winding for createShapes
 * @returns {{ shapes: THREE.Shape[], warnings: string[], info: object }}
 */
export function parseSVG(svgText, params, fixWindingOrder = false) {
  const { plateWidth, plateHeight, designScale } = params;

  // Sanitize scientific notation
  const sanitized = sanitizeSvgText(svgText);

  // Parse with DOMParser for validation
  const domParser = new DOMParser();
  const domDoc = domParser.parseFromString(sanitized, 'image/svg+xml');

  const parseError = domDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('SVG parse error: ' + parseError.textContent.slice(0, 200));
  }

  const warnings = validateSvg(domDoc);

  // Get SVG viewport dimensions for info display
  const svgEl = domDoc.documentElement;
  const viewBox = svgEl.getAttribute('viewBox');
  let svgWidth = parseFloat(svgEl.getAttribute('width')) || 0;
  let svgHeight = parseFloat(svgEl.getAttribute('height')) || 0;
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/);
    if (parts.length === 4) {
      svgWidth = svgWidth || parseFloat(parts[2]);
      svgHeight = svgHeight || parseFloat(parts[3]);
    }
  }

  // Use SVGLoader to parse paths (handles all transforms, compound paths, holes)
  const loader = new SVGLoader();
  const data = loader.parse(sanitized);

  const allShapes = [];
  for (const path of data.paths) {
    const isCCW = fixWindingOrder;
    const shapes = SVGLoader.createShapes(path, isCCW);
    allShapes.push(...shapes);
  }

  if (allShapes.length === 0) {
    throw new Error('No shapes extracted from SVG. Try enabling "Fix winding order" or ensure paths are filled.');
  }

  // Filter out tiny shapes (< 0.4mm bounding box diagonal — not printable)
  const MIN_DIAGONAL_MM = 0.4;
  const targetW = plateWidth * designScale;
  const targetH = plateHeight * designScale;

  // Compute raw bounding box to get scale for filtering
  const rawBox = computeShapesBoundingBox(allShapes);
  const rawSize = new THREE.Vector2();
  rawBox.getSize(rawSize);
  const rawScale = rawSize.x > 0 && rawSize.y > 0
    ? Math.min(targetW / rawSize.x, targetH / rawSize.y)
    : 1;

  const filteredShapes = allShapes.filter(shape => {
    const box = new THREE.Box2();
    for (const p of shape.getPoints(32)) box.expandByPoint(p);
    const s = new THREE.Vector2();
    box.getSize(s);
    const diagMm = Math.sqrt(s.x * s.x + s.y * s.y) * rawScale;
    return diagMm >= MIN_DIAGONAL_MM;
  });

  if (filteredShapes.length === 0) {
    throw new Error('All detected shapes are smaller than 0.4mm. The design may be too detailed for the selected plate size.');
  }

  // Normalize: scale + center + mirror X + flip Y
  const normalizedShapes = normalizeShapes(filteredShapes, targetW, targetH);

  return {
    shapes: normalizedShapes,
    warnings,
    info: {
      svgWidth: Math.round(svgWidth),
      svgHeight: Math.round(svgHeight),
      pathCount: filteredShapes.length,
    },
  };
}
