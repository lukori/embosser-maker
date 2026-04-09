import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { offsetShapes } from './polygonOffset.js';

const yield_ = () => new Promise(r => setTimeout(r, 0));

/**
 * Builds a rounded-rectangle THREE.Shape for the plate base.
 */
function buildRoundedRectShape(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w / 2, h / 2 - r);
  shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/**
 * Builds the solid plate base geometry extruded along Z.
 */
function buildPlateBase(params) {
  const { plateWidth, plateHeight, cornerRadius, baseThickness } = params;
  const shape = buildRoundedRectShape(plateWidth, plateHeight, cornerRadius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: baseThickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 16,
  });
  return geo;
}

/**
 * CSG-subtracts two magnet pocket cylinders from the plate brush.
 * Returns the result Brush (not raw geometry).
 */
async function subtractMagnetPockets(plateBrush, params, abortToken) {
  const { plateWidth, baseThickness, magnetDiameter, magnetDepth, magnetInset } = params;
  const r = magnetDiameter / 2;
  // Cylinder extends slightly above the top face (0.1mm) to guarantee clean cut
  const cylinderHeight = magnetDepth + 0.2;
  // Center the cylinder so its TOP is at baseThickness + 0.1 (above top face)
  // and its BOTTOM is at baseThickness - magnetDepth + 0.1
  const centerZ = baseThickness - magnetDepth / 2 + 0.1;

  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  const magnetPositions = [
    [-(plateWidth / 2 - magnetInset), 0],
    [+(plateWidth / 2 - magnetInset), 0],
  ];

  let result = plateBrush;

  for (const [mx, my] of magnetPositions) {
    if (abortToken.abort) return null;

    const cylGeo = new THREE.CylinderGeometry(r, r, cylinderHeight, 32, 1, false);
    // CylinderGeometry is Y-axis aligned; rotate to Z-axis
    cylGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));

    const cylBrush = new Brush(cylGeo);
    cylBrush.position.set(mx, my, centerZ);
    cylBrush.updateMatrixWorld();

    result = evaluator.evaluate(result, cylBrush, SUBTRACTION);
    result.updateMatrixWorld();
    cylGeo.dispose();

    await yield_();
  }

  return result;
}

/**
 * Extracts clean geometry from a Brush result (resets drawRange).
 */
function brushToGeometry(brush) {
  const geo = brush.geometry.clone();
  geo.drawRange = { start: 0, count: Infinity };
  return geo;
}

/**
 * Builds a plain plate preview (base + magnet pockets, no design).
 * Used when no SVG has been uploaded yet so the user can see the plate shape.
 */
export async function buildPreviewPlate(params, abortToken) {
  const plateGeo = buildPlateBase(params);
  const plateBrush = new Brush(plateGeo);
  plateBrush.updateMatrixWorld();
  await yield_();
  if (abortToken.abort) { plateGeo.dispose(); return null; }

  const withMagnets = await subtractMagnetPockets(plateBrush, params, abortToken);
  if (abortToken.abort || !withMagnets) { plateGeo.dispose(); return null; }

  const finalGeo = brushToGeometry(withMagnets);
  plateGeo.dispose();
  return finalGeo;
}

/**
 * Builds the MALE die geometry: plate + raised logo relief.
 * No CSG needed — relief geometries are merged additively.
 *
 * @param {THREE.Shape[]} shapes - Normalized logo shapes (already mirrored/centered)
 * @param {object} params - Geometry parameters
 * @param {{ abort: boolean }} abortToken
 * @returns {Promise<THREE.BufferGeometry|null>}
 */
export async function buildMaleDie(shapes, params, abortToken) {
  const { baseThickness, reliefHeight } = params;

  // Step 1: Build plate base
  const plateGeo = buildPlateBase(params);
  const plateBrush = new Brush(plateGeo);
  plateBrush.updateMatrixWorld();
  await yield_();
  if (abortToken.abort) { plateGeo.dispose(); return null; }

  // Step 2: Subtract magnet pockets
  const plateWithMagnets = await subtractMagnetPockets(plateBrush, params, abortToken);
  if (abortToken.abort || !plateWithMagnets) { plateGeo.dispose(); return null; }
  await yield_();

  // Step 3: Build relief extrusions for each shape
  const reliefGeos = [];
  for (const shape of shapes) {
    if (abortToken.abort) break;
    const reliefGeo = new THREE.ExtrudeGeometry(shape, {
      depth: reliefHeight,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 12,
    });
    // Translate so relief sits on top face (z = baseThickness)
    reliefGeo.translate(0, 0, baseThickness);
    reliefGeos.push(reliefGeo);
  }
  if (abortToken.abort) {
    reliefGeos.forEach(g => g.dispose());
    return null;
  }

  await yield_();

  // Step 4: Merge plate + relief geometries.
  // CSG output is non-indexed; ExtrudeGeometry is indexed.
  // mergeGeometries requires all inputs to share the same index type,
  // so convert everything to non-indexed first.
  const plateFinalGeo = brushToGeometry(plateWithMagnets);
  const allGeos = [
    plateFinalGeo.toNonIndexed(),
    ...reliefGeos.map(g => g.toNonIndexed()),
  ];
  plateFinalGeo.dispose();
  reliefGeos.forEach(g => g.dispose());

  const merged = mergeGeometries(allGeos, false);
  allGeos.forEach(g => g.dispose());
  plateGeo.dispose();

  return merged;
}

/**
 * Mirrors an array of THREE.Shape objects by negating X coordinates.
 * Required so the female cavity aligns with the male relief when the
 * female die is flipped face-down (180° rotation around the Y axis
 * negates X). Without this, asymmetric logos would collide instead
 * of fitting together.
 */
function mirrorShapesX(shapes) {
  return shapes.map(shape => {
    const mirrorPt = p => new THREE.Vector2(-p.x, p.y);

    const newShape = new THREE.Shape();
    newShape.setFromPoints(shape.getPoints(64).map(mirrorPt));
    newShape.holes = shape.holes.map(hole => {
      const newHole = new THREE.Path();
      newHole.setFromPoints(hole.getPoints(64).map(mirrorPt));
      return newHole;
    });
    return newShape;
  });
}

/**
 * Builds the FEMALE die geometry: plate with recessed logo cavity.
 *
 * Uses CSG subtraction with X-mirrored shapes so the cavity aligns
 * with the male relief when the female die is flipped face-down:
 * - Black (filled) areas → recessed pockets
 * - White (hole) areas within shapes → stay at plate level
 *
 * The cavity depth is (reliefHeight + paperGap) so the male relief
 * fits with clearance for the paper.
 */
export async function buildFemaleDie(shapes, params, abortToken) {
  const { baseThickness, reliefHeight, paperGap } = params;

  // Step 1: Build plate base + magnet pockets (same as male die start)
  const plateGeo = buildPlateBase(params);
  const plateBrush = new Brush(plateGeo.toNonIndexed());
  plateBrush.updateMatrixWorld();
  await yield_();
  if (abortToken.abort) { plateGeo.dispose(); return null; }

  const plateWithMagnets = await subtractMagnetPockets(plateBrush, params, abortToken);
  plateGeo.dispose();
  if (abortToken.abort || !plateWithMagnets) return null;
  await yield_();

  // Step 2: CSG-subtract X-mirrored, outward-offset shapes from the plate.
  // mirrorShapesX: compensates for the 180° Y-axis flip when placing the
  //   female die face-down — the flip negates X, so building from -X lands
  //   the cavity exactly over the male relief.
  // offsetShapes: expands each cavity by paperGap mm in XY so the paper can
  //   deform into the gap around the male relief without tearing.
  const mirroredShapes = mirrorShapesX(shapes);
  const offsetMirroredShapes = offsetShapes(mirroredShapes, paperGap);
  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  // Cavity depth matches the male relief exactly; the cutter gets +0.1mm
  // epsilon so it cleanly breaks through the top face in CSG.
  const cutterDepth = reliefHeight + 0.1;
  // Position cutter so its top is 0.05 above top face, bottom is inside plate
  const cutterZ = baseThickness - cutterDepth + 0.05;

  let result = plateWithMagnets;

  for (const shape of offsetMirroredShapes) {
    if (abortToken.abort) break;

    const cutterGeo = new THREE.ExtrudeGeometry(shape, {
      depth: cutterDepth,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 12,
    });

    const cutterBrush = new Brush(cutterGeo.toNonIndexed());
    cutterBrush.position.set(0, 0, cutterZ);
    cutterBrush.updateMatrixWorld();

    result = evaluator.evaluate(result, cutterBrush, SUBTRACTION);
    result.updateMatrixWorld();
    cutterGeo.dispose();

    await yield_();
  }

  if (abortToken.abort) return null;

  return brushToGeometry(result);
}
