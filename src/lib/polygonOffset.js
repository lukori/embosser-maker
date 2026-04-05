import ClipperLib from 'clipper-lib';
import * as THREE from 'three';

// Scale factor: 1 mm = 1000 Clipper units (1 micrometer precision)
const CLIPPER_SCALE = 1000;

function shapeToClipperPath(shape, numPoints = 64) {
  return shape.getPoints(numPoints).map(p => ({
    X: Math.round(p.x * CLIPPER_SCALE),
    Y: Math.round(p.y * CLIPPER_SCALE),
  }));
}

function clipperPathToShape(path) {
  const shape = new THREE.Shape();
  shape.setFromPoints(path.map(p => new THREE.Vector2(p.X / CLIPPER_SCALE, p.Y / CLIPPER_SCALE)));
  return shape;
}

/**
 * Offsets each THREE.Shape individually by `offsetMm` millimeters outward.
 *
 * Each shape is processed in its own ClipperOffset call so individual paths
 * are never unioned together — this preserves all interior detail in the
 * female die cavity (otherwise SimplifyPolygons would merge close paths
 * into a single outer silhouette, losing the design detail).
 */
export function offsetShapes(shapes, offsetMm) {
  if (offsetMm <= 0 || shapes.length === 0) return shapes;

  const result = [];

  for (const shape of shapes) {
    const path = shapeToClipperPath(shape);

    const co = new ClipperLib.ClipperOffset(2, 0.25);
    // AddPath (singular) — offset this one path in isolation
    co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);

    const paths = new ClipperLib.Paths();
    co.Execute(paths, offsetMm * CLIPPER_SCALE);

    if (!paths || paths.length === 0) {
      // Offset failed for this shape — use original
      result.push(shape);
      continue;
    }

    // Simplify only this shape's offset result (no cross-shape unioning)
    const simplified = ClipperLib.Clipper.SimplifyPolygons(
      paths,
      ClipperLib.PolyFillType.pftNonZero
    );

    for (const p of simplified) {
      result.push(clipperPathToShape(p));
    }
  }

  return result.length > 0 ? result : shapes;
}
