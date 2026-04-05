const C = {
  bg: '#001711',
  surfaceLowest: '#00110c',
  surfaceContainer: '#00251c',
  surfaceHigh: '#003126',
  primary: '#d9c92b',
  primaryFixed: '#f6e548',
  onPrimary: '#363100',
  onSurface: '#b3efda',
  onSurfaceVariant: '#bfc9c3',
  outline: '#8a938e',
  outlineVariant: '#404945',
};

export default function PrintTipsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const headingStyle = {
    fontFamily: "'Space Grotesk', sans-serif",
    color: C.primary, fontWeight: '700', fontSize: '10px',
    marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.15em',
  };
  const listStyle = { listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' };
  const itemStyle = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '11px', color: C.onSurfaceVariant, lineHeight: '1.5',
  };
  const hl = { color: C.onSurface };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: C.surfaceContainer,
          border: `1px solid ${C.outlineVariant}`,
          padding: '24px', maxWidth: '400px', width: '100%', margin: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: C.primary, fontWeight: '900', fontSize: '14px',
              textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
            }}>Print Tips</h2>
            <div style={{ fontFamily: 'monospace', color: C.outline, fontSize: '9px', marginTop: '2px' }}>
              REF: PRINT-GUIDE // v1.0
            </div>
          </div>
          <button onClick={onClose} style={{
            color: C.outline, background: 'none',
            border: `1px solid ${C.outlineVariant}`,
            fontSize: '14px', cursor: 'pointer', lineHeight: 1,
            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace',
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={headingStyle}>Print Settings</div>
            <ul style={listStyle}>
              <li style={itemStyle}>— Layer height: <span style={hl}>0.1–0.2mm</span> (finer = crisper relief)</li>
              <li style={itemStyle}>— Infill: <span style={hl}>50%+</span></li>
              <li style={itemStyle}>— Material: <span style={hl}>PLA or PETG</span></li>
              <li style={itemStyle}>— Supports: <span style={hl}>Not needed (face-up orientation)</span></li>
            </ul>
          </div>

          <div>
            <div style={headingStyle}>Orientation</div>
            <ul style={listStyle}>
              <li style={itemStyle}>— <span style={hl}>Male die:</span> Print face-up (relief pointing up)</li>
              <li style={itemStyle}>— <span style={hl}>Female die:</span> Face-up or face-down with supports</li>
            </ul>
          </div>

          <div>
            <div style={headingStyle}>Magnets</div>
            <ul style={listStyle}>
              <li style={itemStyle}>— Use <span style={hl}>8×3mm neodymium disc magnets</span> (N35 or stronger)</li>
              <li style={{ ...itemStyle, color: C.primaryFixed }}>⚠ Test polarity before gluing — must attract face-to-face</li>
              <li style={itemStyle}>— Press-fit or use a drop of super glue</li>
            </ul>
          </div>

          <div>
            <div style={headingStyle}>Usage</div>
            <ul style={listStyle}>
              <li style={itemStyle}>— Place paper between the two plates</li>
              <li style={itemStyle}>— Align with magnets and press firmly or use a book clamp</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', border: 'none',
            backgroundColor: C.primary, color: C.onPrimary,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', marginTop: '20px',
          }}
        >
          CONFIRMED
        </button>
      </div>
    </div>
  );
}
