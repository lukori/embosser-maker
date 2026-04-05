import { useState, useEffect, useRef, useCallback } from 'react';
import { buildMaleDie, buildFemaleDie, buildPreviewPlate } from '../lib/geometryBuilder.js';

export function useEmbosserGeometry(svgShapes, params) {
  const [geometries, setGeometries] = useState({ male: null, female: null });
  const [previewGeometry, setPreviewGeometry] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef({ abort: false });
  const debounceRef = useRef(null);

  // Dispose geometries AFTER they leave state (via useEffect cleanup).
  // Never dispose inside the async builder — that races with React state reads
  // and causes geometry.clone() to throw on download.
  useEffect(() => {
    return () => {
      geometries.male?.dispose();
      geometries.female?.dispose();
    };
  }, [geometries]);

  useEffect(() => {
    return () => {
      previewGeometry?.dispose();
    };
  }, [previewGeometry]);

  const rebuild = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current.abort = true;
      const abortToken = { abort: false };
      abortRef.current = abortToken;

      setIsBuilding(true);
      setError(null);

      const hasSvg = svgShapes && svgShapes.length > 0;

      try {
        if (hasSvg) {
          const maleGeo = await buildMaleDie(svgShapes, params, abortToken);
          if (abortToken.abort) { maleGeo?.dispose(); return; }

          const femaleGeo = await buildFemaleDie(svgShapes, params, abortToken);
          if (abortToken.abort) { maleGeo?.dispose(); femaleGeo?.dispose(); return; }

          setGeometries({ male: maleGeo, female: femaleGeo });
          setPreviewGeometry(null);
        } else {
          const preview = await buildPreviewPlate(params, abortToken);
          if (abortToken.abort) { preview?.dispose(); return; }

          setGeometries({ male: null, female: null });
          setPreviewGeometry(preview);
        }
      } catch (err) {
        console.error('Geometry build error:', err);
        setError(err.message || 'Failed to build geometry.');
      } finally {
        if (!abortToken.abort) setIsBuilding(false);
      }
    }, 300);
  }, [svgShapes, params]);

  useEffect(() => {
    rebuild();
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current.abort = true;
    };
  }, [rebuild]);

  return { geometries, previewGeometry, isBuilding, error };
}
