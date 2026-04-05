import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import * as THREE from 'three';

const exporter = new STLExporter();

/**
 * Exports a THREE.BufferGeometry to binary STL and triggers a browser download.
 * @param {THREE.BufferGeometry} geometry
 * @param {string} filename - e.g. "embosser_male.stl"
 */
export function downloadSTL(geometry, filename) {
  // Clone and reset drawRange — CSG results use drawRange internally
  const exportGeo = geometry.clone();
  exportGeo.drawRange = { start: 0, count: Infinity };

  const mesh = new THREE.Mesh(exportGeo, new THREE.MeshStandardMaterial());
  const stlData = exporter.parse(mesh, { binary: true });

  exportGeo.dispose();

  const blob = new Blob([stlData], { type: 'application/octet-stream' });
  triggerDownload(blob, filename);
}

/**
 * Returns an ArrayBuffer of binary STL data for the given geometry.
 * Used when packaging into a ZIP.
 */
export function geometryToSTLBuffer(geometry) {
  const exportGeo = geometry.clone();
  exportGeo.drawRange = { start: 0, count: Infinity };

  const mesh = new THREE.Mesh(exportGeo, new THREE.MeshStandardMaterial());
  const stlData = exporter.parse(mesh, { binary: true });
  exportGeo.dispose();

  return stlData;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
