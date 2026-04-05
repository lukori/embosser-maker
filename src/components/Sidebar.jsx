import { useRef, useState } from 'react';
import ParameterSlider from './ParameterSlider.jsx';
import SVGPreview from './SVGPreview.jsx';
import PrintTipsModal from './PrintTipsModal.jsx';
import { downloadSTL } from '../lib/stlExporter.js';
import { downloadZip } from '../lib/zipExporter.js';

// Design tokens from The Crafting Block Editor
const C = {
  bg: '#001711',
  surface: '#001711',
  surfaceLow: '#002018',
  surfaceContainer: '#00251c',
  surfaceHigh: '#003126',
  surfaceBright: '#004234',
  surfaceHighest: '#003d30',
  surfaceLowest: '#00110c',
  primary: '#d9c92b',
  primaryFixed: '#f6e548',
  onPrimary: '#363100',
  onSurface: '#b3efda',
  onSurfaceVariant: '#bfc9c3',
  outline: '#8a938e',
  outlineVariant: '#404945',
  error: '#ffb4ab',
};

const PARAMS_CONFIG = [
  {
    group: 'PLATE DIMENSIONS',
    coord: 'B2',
    num: '02',
    params: [
      { key: 'plateWidth',    label: 'Width',         min: 40,  max: 120, step: 1,    unit: 'mm', tooltip: 'Horizontal dimension of each plate.' },
      { key: 'plateHeight',   label: 'Height',        min: 30,  max: 80,  step: 1,    unit: 'mm', tooltip: 'Vertical dimension of each plate.' },
      { key: 'cornerRadius',  label: 'Corner Radius', min: 0,   max: 10,  step: 0.5,  unit: 'mm', tooltip: 'Rounded corner radius. 0 = sharp corners.' },
      { key: 'baseThickness', label: 'Thickness',     min: 2,   max: 8,   step: 0.5,  unit: 'mm', tooltip: 'Total thickness of each plate.' },
    ],
  },
  {
    group: 'DESIGN',
    coord: 'C3',
    num: '03',
    params: [
      { key: 'reliefHeight', label: 'Relief Height', min: 0.5, max: 2.0, step: 0.1,  unit: 'mm', tooltip: 'Height of raised logo on the male die.' },
      { key: 'paperGap',     label: 'Paper Gap',     min: 0.1, max: 0.6, step: 0.05, unit: 'mm', tooltip: 'Outward offset on female cavity — allows paper to deform without tearing.' },
      { key: 'designScale',  label: 'Design Scale',  min: 40,  max: 95,  step: 1,    unit: '%',  tooltip: 'How much of the plate face the logo occupies.' },
    ],
  },
  {
    group: 'MAGNETS',
    coord: 'D4',
    num: '04',
    params: [
      { key: 'magnetDiameter', label: 'Diameter', min: 4,  max: 12, step: 0.5, unit: 'mm', tooltip: 'Diameter of neodymium disc magnets. Standard: 8mm.' },
      { key: 'magnetDepth',    label: 'Depth',    min: 2,  max: 5,  step: 0.5, unit: 'mm', tooltip: 'Depth of blind pocket hole. Standard: 3mm.' },
      { key: 'magnetInset',    label: 'Inset',    min: 4,  max: 15, step: 0.5, unit: 'mm', tooltip: 'Distance from short edge to magnet center.' },
    ],
  },
];

const label = (text, num, coord) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
    <span style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '10px', letterSpacing: '0.2em',
      color: C.onSurfaceVariant, textTransform: 'uppercase', fontWeight: '700',
    }}>
      {num}. {text}
    </span>
    <span style={{ fontFamily: 'monospace', fontSize: '9px', color: C.primary, opacity: 0.5 }}>
      COORD: {coord}
    </span>
  </div>
);

export default function Sidebar({
  svgText, svgInfo, svgWarnings, svgError,
  params, setParams,
  geometries, isBuilding,
  fixWindingOrder, setFixWindingOrder,
  onSvgLoad,
}) {
  const fileInputRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('Only SVG files are accepted. Please convert your logo to SVG first using a tool like Inkscape, Adobe Illustrator, or vectorizer.ai.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => onSvgLoad(e.target.result);
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleDownload(type) {
    if (!geometries.male || !geometries.female) return;
    if (type === 'male') downloadSTL(geometries.male, 'embosser_male.stl');
    else if (type === 'female') downloadSTL(geometries.female, 'embosser_female.stl');
    else downloadZip(geometries.male, geometries.female);
  }

  const validationErrors = [];
  if (params.paperGap < 0.2) validationErrors.push('Paper gap too small — paper may tear.');
  if (params.reliefHeight < 0.8) validationErrors.push('Relief may be too shallow to feel.');
  if (params.magnetDepth >= params.baseThickness) validationErrors.push('Magnet pocket would go through the plate.');

  const canDownload = !!(geometries.male && geometries.female && !isBuilding);
  const designPadding = ((1 - params.designScale / 100) / 2 * params.plateWidth).toFixed(1);

  return (
    <aside style={{
      width: '300px', minWidth: '300px',
      backgroundColor: C.bg,
      borderRight: `1px solid rgba(179,239,218,0.12)`,
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid rgba(179,239,218,0.12)`,
        flexShrink: 0,
        backgroundColor: C.surfaceLowest,
      }}>
        <div style={{
          fontFamily: "'Lobster', cursive",
          color: C.primary, fontWeight: 'normal', fontSize: '22px',
          letterSpacing: '0.01em',
        }}>
          The Embosser
        </div>
        <div style={{
          fontFamily: 'monospace', color: C.onSurfaceVariant,
          fontSize: '9px', marginTop: '3px', opacity: 0.6,
        }}>
          REF: EM-001 // 3D DRY STAMP EDITOR v2.4
        </div>
        <div style={{
          display: 'inline-block', marginTop: '8px',
          fontFamily: 'monospace', fontSize: '9px',
          color: C.primary, border: `1px solid rgba(217,201,43,0.3)`,
          padding: '2px 8px', backgroundColor: C.surfaceContainer,
          letterSpacing: '0.1em',
        }}>
          {isBuilding ? 'STATUS: BUILDING...' : 'STATUS: READY'}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* 01 — Vector Source */}
        <div>
          {label('Vector Source', '01', 'A1')}

          <div
            style={{
              border: `1.5px dashed ${isDragging ? C.primary : C.outlineVariant}`,
              padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
              backgroundColor: isDragging ? 'rgba(217,201,43,0.05)' : C.surfaceLow,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: svgText ? C.primary : C.onSurfaceVariant,
              fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {svgText ? '✓ SVG Loaded — Drop to Replace' : 'Drop SVG File Here'}
            </div>
            <div style={{ fontFamily: 'monospace', color: C.outline, fontSize: '9px', marginTop: '4px' }}>
              MAX SIZE: 5.0 MB
            </div>
            {isDragging && (
              <div style={{
                position: 'absolute', bottom: '6px', right: '8px',
                fontFamily: 'monospace', fontSize: '9px', color: C.primary, opacity: 0.7,
              }}>
                UPLOAD_INITIATED
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {svgError && (
            <div style={{
              fontFamily: 'monospace', fontSize: '10px', color: C.error,
              backgroundColor: 'rgba(255,180,171,0.08)',
              border: `1px solid rgba(255,180,171,0.2)`,
              padding: '6px 8px', marginTop: '8px',
            }}>
              ✗ {svgError}
            </div>
          )}

          <div style={{ marginTop: '10px' }}>
            <SVGPreview svgText={svgText} info={svgInfo} warnings={svgWarnings} />
          </div>
        </div>

        {/* Winding order toggle */}
        {svgText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-12px' }}>
            <input
              type="checkbox"
              id="fixWinding"
              checked={fixWindingOrder}
              onChange={e => setFixWindingOrder(e.target.checked)}
              style={{ accentColor: C.primary }}
            />
            <label htmlFor="fixWinding" style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '10px', color: C.onSurfaceVariant,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Fix winding order (inverted design)
            </label>
          </div>
        )}

        {/* Parameter groups */}
        {PARAMS_CONFIG.map(group => (
          <div key={group.group}>
            {label(group.group, group.num, group.coord)}
            <div style={{ backgroundColor: C.surfaceContainer, padding: '12px 14px' }}>
              {group.params.map(({ key, label: lbl, min, max, step, unit, tooltip }) => {
                const displayVal = key === 'designScale'
                  ? Math.round(params.designScale * 100)
                  : params[key];
                return (
                  <ParameterSlider
                    key={key}
                    label={lbl}
                    value={displayVal}
                    min={min}
                    max={max}
                    step={step}
                    unit={unit}
                    tooltip={tooltip}
                    onChange={val => {
                      const actual = key === 'designScale' ? val / 100 : val;
                      setParams(p => ({ ...p, [key]: actual }));
                    }}
                  />
                );
              })}
              {group.group === 'DESIGN' && (
                <ParameterSlider
                  label="Design Padding"
                  value={designPadding}
                  unit="mm"
                  tooltip="Space between logo and plate edge (calculated from design scale)."
                  readOnly
                />
              )}
            </div>
          </div>
        ))}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {validationErrors.map((e, i) => (
              <div key={i} style={{
                fontFamily: 'monospace', fontSize: '10px', color: C.error,
                backgroundColor: 'rgba(255,180,171,0.08)',
                border: `1px solid rgba(255,180,171,0.2)`,
                padding: '6px 8px',
              }}>
                ⚠ {e}
              </div>
            ))}
          </div>
        )}

        {/* Magnet note */}
        <div style={{
          backgroundColor: C.surfaceLowest,
          border: `1px solid rgba(179,239,218,0.08)`,
          padding: '12px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <div style={{
            width: '32px', height: '32px', flexShrink: 0,
            border: `1px solid rgba(217,201,43,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.primary, fontSize: '14px',
          }}>⚡</div>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '9px', color: C.onSurfaceVariant,
            lineHeight: '1.6', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Test magnet polarity before gluing — plates must attract face-to-face. Tolerance: 0.05mm.
          </p>
        </div>
      </div>

      {/* Footer — Production Export */}
      <div style={{
        padding: '16px 20px',
        borderTop: `1px solid rgba(179,239,218,0.12)`,
        flexShrink: 0,
        backgroundColor: C.surfaceLowest,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '10px', letterSpacing: '0.2em',
          color: C.onSurfaceVariant, textTransform: 'uppercase', fontWeight: '700',
          marginBottom: '4px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>05. Production Export</span>
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: C.primary, opacity: 0.5 }}>COORD: E5</span>
        </div>

        {isBuilding && (
          <div style={{
            fontFamily: 'monospace', textAlign: 'center',
            fontSize: '10px', color: C.primary, letterSpacing: '0.1em',
          }}>
            BUILDING_GEOMETRY...
          </div>
        )}

        <button
          disabled={!canDownload}
          onClick={() => handleDownload('male')}
          style={{
            width: '100%', padding: '10px', border: `1px solid ${canDownload ? 'rgba(217,201,43,0.3)' : C.outlineVariant}`,
            backgroundColor: canDownload ? C.surfaceHigh : C.surfaceLow,
            color: canDownload ? C.primary : C.outline,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
            fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: canDownload ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          ↓ DOWNLOAD MALE DIE (.STL)
        </button>

        <button
          disabled={!canDownload}
          onClick={() => handleDownload('female')}
          style={{
            width: '100%', padding: '10px', border: `1px solid ${canDownload ? 'rgba(217,201,43,0.3)' : C.outlineVariant}`,
            backgroundColor: canDownload ? C.surfaceHigh : C.surfaceLow,
            color: canDownload ? C.primary : C.outline,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
            fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: canDownload ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          ↓ DOWNLOAD FEMALE DIE (.STL)
        </button>

        <button
          disabled={!canDownload}
          onClick={() => handleDownload('zip')}
          style={{
            width: '100%', padding: '11px', border: 'none',
            backgroundColor: canDownload ? C.primary : C.surfaceContainer,
            color: canDownload ? C.onPrimary : C.outline,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: canDownload ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          ↓ DOWNLOAD BOTH (ZIP)
        </button>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'none', border: 'none',
            color: C.outline, fontSize: '10px', cursor: 'pointer',
            textAlign: 'center', padding: '2px',
            fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}
        >
          Print Tips &amp; Magnet Guide
        </button>
      </div>

      <PrintTipsModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </aside>
  );
}
