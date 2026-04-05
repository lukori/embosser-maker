import { useState } from 'react';

const C = {
  primary: '#d9c92b',
  onSurface: '#b3efda',
  onSurfaceVariant: '#bfc9c3',
  outline: '#8a938e',
  outlineVariant: '#404945',
  surfaceContainer: '#00251c',
  surfaceLow: '#002018',
};

export default function ParameterSlider({ label, value, min, max, step, unit, tooltip, onChange, readOnly }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '10px', color: C.onSurfaceVariant,
            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>{label}</span>
          {tooltip && (
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  width: '14px', height: '14px',
                  backgroundColor: C.surfaceLow,
                  border: `1px solid ${C.outlineVariant}`,
                  color: C.outline, fontSize: '8px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  fontFamily: 'monospace',
                }}
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
              >
                ?
              </button>
              {showTip && (
                <div style={{
                  position: 'absolute', left: '18px', top: 0, zIndex: 50,
                  backgroundColor: C.surfaceContainer,
                  border: `1px solid ${C.outlineVariant}`,
                  padding: '8px', fontSize: '10px', color: C.onSurface, width: '180px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)', pointerEvents: 'none', lineHeight: '1.5',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '12px', color: C.primary,
          fontFamily: 'monospace', letterSpacing: '0.05em',
        }}>
          {value}{unit}
        </span>
      </div>

      {readOnly ? (
        <div style={{ width: '100%', height: '2px', backgroundColor: C.outlineVariant }} />
      ) : (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: C.primary }}
        />
      )}

      {!readOnly && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'monospace', fontSize: '9px', color: C.outline, marginTop: '1px',
        }}>
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  );
}
