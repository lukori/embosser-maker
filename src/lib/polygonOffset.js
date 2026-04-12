import ClipperLib from 'clipper-lib';
import * as THREE from 'three';

// Scale factor: 1 mm = 1000 Clipper units (1 micrometer precision)
const CLIPPER_SCALE = 1000;

function toClipperPath(points) {
  return points.map(p => ({
    X: Math.round(p.x * CLIPPER_SCALE),
    Y: Math.round(p.y * CLIPPER_SCALE),
  }));
}

function fromClipperPath(path) {
  return path.map(p => new THREE.Vector2(p.X / CLIPPER_SCALE, p.Y / CLIPPER_SCALE));
}

function clipperOffset(points, deltaMm) {
  const path = toClipperPath(points);
  const co = new ClipperLib.ClipperOffset(2, 0.25);
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const paths = new ClipperLib.Paths();
  co.Execute(paths, deltaMm * CLIPPER_SCALE);
  if (!paths || paths.length === 0) return null;
  const simplified = ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero);
  if (!simplified || simplified.length === 0) return null;
  return simplified[0];
}

/**
 * Offsets each THREE.Shape outward by `offsetMm` millimeters, preserving holes.
 *
 * - Outer contour: expanded outward by +offsetMm
 * - Holes: shrunk inward by -offsetMm so the pillar inside the female cavity
 *   grows by the same amount, creating uniform clearance on all sides of the
 *   male relief (both outside the outline and inside counter-forms like letter holes).
 *
 * Each shape is processed independently so paths are never unioned together —
 * this preserves all interior detail.
 */
export function offsetShapes(shapes, offsetMm) {
  if (offsetMm <= 0 || shapes.length === 0) return shapes;

  const result = [];

  for (const shape of shapes) {
    // Expand outer contour outward
    const outerOffsetted = clipperOffset(shape.getPoints(64), offsetMm);
    if (!outerOffsetted) {
      result.push(shape);
      continue;
    }

    const newShape = new THREE.Shape();
    newShape.setFromPoints(fromClipperPath(outerOffsetted));

    // Shrink each hole inward — makes the pillar inside the female cavity
    // larger, creating the same paperGap clearance on the inner walls.
    for (const hole of shape.holes) {
      const holeOffsetted = clipperOffset(hole.getPoints(64), -offsetMm);
      if (holeOffsetted && holeOffsetted.length >= 3) {
        const newHole = new THREE.Path();
        newHole.setFromPoints(fromClipperPath(holeOffsetted));
        newShape.holes.push(newHole);
      }
      // If hole shrinks to nothing, omit it — pillar fills the space, which is fine
    }

    result.push(newShape);
  }

  return result.length > 0 ? result : shapes;
}
