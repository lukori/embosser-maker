import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function Preview3D({ geometries, previewGeometry, params, isBuilding }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshGroupRef = useRef(null);
  const paperPlaneRef = useRef(null);
  const animIdRef = useRef(null);

  const [showAligned, setShowAligned] = useState(false);

  // One-time scene setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x001711);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lighting: ambient + two directional lights at different angles
    // so both raised relief (male) and recessed cavities (female) read clearly.
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const dirTop = new THREE.DirectionalLight(0xffffff, 0.8);
    dirTop.position.set(50, 100, 80);   // main: upper-front-right
    const dirSide = new THREE.DirectionalLight(0xffffff, 0.5);
    dirSide.position.set(-80, -20, 30); // fill: lower-front-left (illuminates cavity walls)
    scene.add(ambient, dirTop, dirSide);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(0, -100, 90);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.saveState();
    controlsRef.current = controls;

    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw > 0 && nh > 0) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update meshes when geometries or previewGeometry change
  useEffect(() => {
    const group = meshGroupRef.current;
    if (!group) return;

    // Clear existing meshes
    group.children.slice().forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      group.remove(child);
    });

    if (geometries.male && geometries.female) {
      // Show full male + female dies side by side
      const gap = params.plateWidth / 2 + 15;

      const maleMesh = new THREE.Mesh(
        geometries.male,
        new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.1 })
      );
      maleMesh.position.x = -gap;

      const femaleMesh = new THREE.Mesh(
        geometries.female,
        new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5, metalness: 0.1 })
      );
      femaleMesh.position.x = gap;

      group.add(maleMesh, femaleMesh);
    } else if (previewGeometry) {
      // Show a single centered preview plate
      const mesh = new THREE.Mesh(
        previewGeometry,
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.55, metalness: 0.1 })
      );
      // Center it (ExtrudeGeometry starts at z=0, center on XY)
      mesh.position.set(0, 0, 0);
      group.add(mesh);
    }
  }, [geometries, previewGeometry, params.plateWidth]);

  // Paper plane for aligned preview
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (paperPlaneRef.current) {
      scene.remove(paperPlaneRef.current);
      paperPlaneRef.current.geometry.dispose();
      paperPlaneRef.current.material.dispose();
      paperPlaneRef.current = null;
    }

    if (showAligned && geometries.male) {
      const w = params.plateWidth;
      const h = params.plateHeight;
      const z = params.baseThickness + params.reliefHeight / 2;
      const planeGeo = new THREE.PlaneGeometry(w * 2 + 30, h);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0xf5f0e8, roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.position.set(0, 0, z);
      scene.add(plane);
      paperPlaneRef.current = plane;
    }
  }, [showAligned, geometries, params]);

  return (
    <div style={{ flex: 1, position: 'relative', backgroundColor: '#001711', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#001711' }} />

      {/* Cutting mat grid overlay */}
      <div className="cutting-mat-grid" style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }} />

      {/* Ruler — top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '28px',
        borderBottom: '1px solid rgba(217,201,43,0.15)',
        backgroundColor: 'rgba(0,17,12,0.6)',
        display: 'flex', alignItems: 'center', paddingLeft: '36px', overflow: 'hidden',
        zIndex: 5, pointerEvents: 'none',
      }}>
        {[0,10,20,30,40,50,60,70,80,90,100,110,120].map(n => (
          <span key={n} style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(217,201,43,0.5)', marginRight: '32px', flexShrink: 0 }}>{String(n).padStart(2,'0')}</span>
        ))}
      </div>

      {/* Ruler — left */}
      <div style={{
        position: 'absolute', top: '28px', left: 0, bottom: '40px', width: '28px',
        borderRight: '1px solid rgba(217,201,43,0.15)',
        backgroundColor: 'rgba(0,17,12,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', overflow: 'hidden',
        zIndex: 5, pointerEvents: 'none',
      }}>
        {[0,10,20,30,40,50,60,70,80,90].map(n => (
          <span key={n} style={{ fontFamily: 'monospace', fontSize: '8px', color: 'rgba(217,201,43,0.5)', marginBottom: '32px', flexShrink: 0 }}>{String(n).padStart(2,'0')}</span>
        ))}
      </div>

      {/* Controls overlay — top right */}
      <div style={{
        position: 'absolute', top: '36px', right: '12px',
        display: 'flex', gap: '8px', zIndex: 10,
      }}>
        <button
          onClick={() => setShowAligned(v => !v)}
          style={{
            padding: '5px 12px', fontSize: '10px', fontWeight: '700',
            cursor: 'pointer',
            border: `1px solid ${showAligned ? '#d9c92b' : 'rgba(217,201,43,0.25)'}`,
            backgroundColor: showAligned ? 'rgba(217,201,43,0.15)' : 'rgba(0,23,17,0.85)',
            color: showAligned ? '#d9c92b' : '#8a938e',
            fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}
        >
          {showAligned ? '✓ ' : ''}Paper Preview
        </button>
        <button
          onClick={() => controlsRef.current?.reset()}
          style={{
            padding: '5px 12px', fontSize: '10px', fontWeight: '700',
            cursor: 'pointer', border: '1px solid rgba(217,201,43,0.25)',
            backgroundColor: 'rgba(0,23,17,0.85)', color: '#8a938e',
            fontFamily: "'Space Grotesk', sans-serif",
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}
        >
          Reset Camera
        </button>
      </div>

      {/* Bottom status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px',
        backgroundColor: 'rgba(0,17,12,0.9)',
        borderTop: '1px solid rgba(217,201,43,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: '24px', fontFamily: 'monospace', fontSize: '9px', color: 'rgba(217,201,43,0.7)' }}>
          {geometries.male && geometries.female ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', backgroundColor: '#d9c92b', display: 'inline-block' }} />
                VIEW_A: MALE_POSITIVE
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', border: '1px solid #d9c92b', display: 'inline-block' }} />
                VIEW_B: FEMALE_NEGATIVE
              </span>
            </>
          ) : previewGeometry ? (
            <span>PLATE_PREVIEW: ACTIVE — UPLOAD SVG TO GENERATE DIES</span>
          ) : (
            <span>AWAITING_INPUT</span>
          )}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(179,239,218,0.4)' }}>
          TOLERANCE: 0.05MM
        </div>
      </div>

      {/* Loading overlay */}
      {isBuilding && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', backgroundColor: 'rgba(0,23,17,0.75)',
          backdropFilter: 'blur(4px)', zIndex: 20,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px', border: '2px solid #d9c92b',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{
              color: '#d9c92b', fontSize: '11px', fontWeight: '700',
              fontFamily: "'Space Grotesk', sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.15em',
            }}>BUILDING_GEOMETRY...</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
