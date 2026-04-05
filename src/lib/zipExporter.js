import JSZip from 'jszip';
import { geometryToSTLBuffer } from './stlExporter.js';

/**
 * Packages both die geometries into a ZIP archive and triggers download.
 * @param {THREE.BufferGeometry} maleGeo
 * @param {THREE.BufferGeometry} femaleGeo
 */
export async function downloadZip(maleGeo, femaleGeo) {
  const zip = new JSZip();

  const maleBuf = geometryToSTLBuffer(maleGeo);
  const femaleBuf = geometryToSTLBuffer(femaleGeo);

  zip.file('embosser_male.stl', maleBuf);
  zip.file('embosser_female.stl', femaleBuf);

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'embosser_dies.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
