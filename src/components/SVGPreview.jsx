const C = {
  primary: '#d9c92b',
  onSurface: '#b3efda',
  onSurfaceVariant: '#bfc9c3',
  outline: '#8a938e',
  outlineVariant: '#404945',
  surfaceLow: '#002018',
};

export default function SVGPreview({ svgText, info, warnings }) {
  const safeSvg = svgText
    ? svgText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '')
    : null;

  if (!safeSvg) {
    return (
      <div style={{
        width: '100%', height: '80px',
        border: `1.5px dashed ${C.outlineVariant}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.outline, fontSize: '10px',
        fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase',
        backgroundColor: C.surfaceLow,
      }}>
        SVG_PREVIEW_NULL
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          width: '100%', height: '80px',
          border: `1px solid ${C.outlineVariant}`,
          backgroundColor: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
        dangerouslySetInnerHTML={{
          __html: safeSvg.replace(/<svg/, '<svg style="max-width:100%;max-height:80px;display:block;"'),
        }}
      />
      {info && (
        <p style={{
          fontFamily: 'monospace', fontSize: '9px', color: C.outline,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {info.svgWidth}×{info.svgHeight}px · {info.pathCount} PATH{info.pathCount !== 1 ? 'S' : ''} DETECTED
        </p>
      )}
      {warnings && warnings.length > 0 && warnings.map((w, i) => (
        <div key={i} style={{
          fontFamily: 'monospace', fontSize: '10px', color: '#f6e548',
          backgroundColor: 'rgba(246,229,72,0.08)',
          border: '1px solid rgba(246,229,72,0.2)',
          padding: '5px 8px', lineHeight: '1.4',
        }}>
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}
