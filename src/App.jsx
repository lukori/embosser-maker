import { useState, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Preview3D from './components/Preview3D.jsx';
import { parseSVG } from './lib/svgParser.js';
import { useEmbosserGeometry } from './hooks/useEmbosserGeometry.js';

const DEFAULT_PARAMS = {
  plateWidth: 70,
  plateHeight: 50,
  cornerRadius: 4,
  baseThickness: 4,
  reliefHeight: 1.2,
  paperGap: 0.7,
  designScale: 0.8,
  magnetDiameter: 8,
  magnetDepth: 3,
  magnetInset: 6,
};

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [svgText, setSvgText] = useState(null);
  const [svgShapes, setSvgShapes] = useState(null);
  const [svgInfo, setSvgInfo] = useState(null);
  const [svgWarnings, setSvgWarnings] = useState([]);
  const [svgError, setSvgError] = useState(null);
  const [fixWindingOrder, setFixWindingOrder] = useState(false);

  const stableParams = useMemo(() => ({ ...params }), [
    params.plateWidth, params.plateHeight, params.cornerRadius,
    params.baseThickness, params.reliefHeight, params.paperGap,
    params.designScale, params.magnetDiameter, params.magnetDepth, params.magnetInset,
  ]);

  const reParseSvg = useCallback((text, currentParams, winding) => {
    if (!text) return;
    try {
      const result = parseSVG(text, currentParams, winding);
      setSvgShapes(result.shapes);
      setSvgInfo(result.info);
      setSvgWarnings(result.warnings);
      setSvgError(null);
    } catch (err) {
      setSvgShapes(null);
      setSvgInfo(null);
      setSvgWarnings([]);
      setSvgError(err.message);
    }
  }, []);

  function handleSvgLoad(text) {
    setSvgText(text);
    reParseSvg(text, stableParams, fixWindingOrder);
  }

  function handleWindingChange(val) {
    setFixWindingOrder(val);
    if (svgText) reParseSvg(svgText, stableParams, val);
  }

  const handleParamsChange = useCallback((updater) => {
    setParams(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (svgText) {
        try {
          const result = parseSVG(svgText, next, fixWindingOrder);
          setSvgShapes(result.shapes);
          setSvgInfo(result.info);
          setSvgWarnings(result.warnings);
          setSvgError(null);
        } catch (err) {
          setSvgShapes(null);
          setSvgError(err.message);
        }
      }
      return next;
    });
  }, [svgText, fixWindingOrder]);

  const { geometries, previewGeometry, isBuilding, error: buildError } = useEmbosserGeometry(svgShapes, stableParams);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#001711', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        svgText={svgText}
        svgInfo={svgInfo}
        svgWarnings={svgWarnings}
        svgError={svgError || buildError}
        params={params}
        setParams={handleParamsChange}
        geometries={geometries}
        isBuilding={isBuilding}
        fixWindingOrder={fixWindingOrder}
        setFixWindingOrder={handleWindingChange}
        onSvgLoad={handleSvgLoad}
      />
      <Preview3D
        geometries={geometries}
        previewGeometry={previewGeometry}
        params={stableParams}
        isBuilding={isBuilding}
      />
    </div>
  );
}
