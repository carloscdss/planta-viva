// src/app/page.tsx
'use client';
import { useRef, useState } from 'react'; // <-- Asegurar useRef y useState
import { Canvas, useFrame } from '@react-three/fiber'; // <-- Asegurar useFrame
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '@/hooks/useEditor';
import { Puntero } from '@/components/Puntero';
import { Equipo3D } from '@/lib/catalogo';
import { TuberiaDinamica } from '@/lib/componentes/TuberiaDinamica';
import { SidebarCatalogo } from '@/components/SidebarCatalogo';
import { PanelPropiedades } from '@/components/PanelPropiedades';
import { BarraSuperior } from '@/components/BarraSuperior';
import { TooltipSimulacion } from '@/components/TooltipSimulacion';
import { PanelBOQ } from '@/components/PanelBOQ';
import { calcularBOQ } from '@/lib/boq'; // <-- ¡ESTA ES LA LÍNEA QUE FALTABA!
import { registrarRendimiento } from '@/lib/diagnostico';

function MedidorRendimiento() {
  const frames = useRef(0);
  const ultimo = useRef(performance.now());
  useFrame((state) => {
    frames.current++;
    const ahora = performance.now();
    if (ahora - ultimo.current >= 1000) {
      registrarRendimiento(frames.current, {
        calls: state.gl.info.render.calls,
        triangles: state.gl.info.render.triangles,
      });
      frames.current = 0;
      ultimo.current = ahora;
    }
  });
  return null;
}

export default function Home() {
  // 1. OBTENEMOS TODA LA LÓGICA DEL HOOK
  const editor = useEditor();
  
  // 2. ESTADO LOCAL PARA EL PANEL DE CÓMPUTOS
  const [mostrarBOQ, setMostrarBOQ] = useState(false);

  return (
    <main className="w-screen h-screen bg-[#101820] relative overflow-hidden">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [10, 10, 10], fov: 50 }} dpr={[1, 1.5]} 
        onPointerDown={(e) => { editor.down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }; }}>
        
        <color attach="background" args={['#101820']} />
        <hemisphereLight args={['#d8f2ff', '#334047', 1.6]} />
        <directionalLight position={[10, 12, 8]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
        
        <Puntero onMove={editor.onMove} />
        <MedidorRendimiento />
        <Grid position={[0, 0.01, 0]} args={[40, 40]} cellSize={1} cellThickness={0.6} cellColor="#2d3b3d" sectionSize={5} sectionThickness={1.1} sectionColor="#52665f" fadeDistance={55} fadeStrength={1.5} infiniteGrid />
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow 
          onClick={(e) => { 
            if (!editor.down.current) return; 
            const dist = Math.hypot(e.nativeEvent.clientX - editor.down.current.x, e.nativeEvent.clientY - editor.down.current.y); 
            editor.down.current = null; 
            if (dist > 7) return; 
            if (e.point) editor.onMove(e.point.x, e.point.z);
            if (editor.modoMover) editor.soltarMover();
else if (editor.activa) editor.colocar();
else editor.setSeleccionado(null);
          }}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#20272a" roughness={0.96} metalness={0.02} />
        </mesh>

{editor.equipos
  .filter(eq => !(editor.modoMover && eq.uuid === editor.seleccionado))
  .map((eq) => (
    <group key={eq.uuid} onClick={(e) => { e.stopPropagation(); editor.seleccionar(eq.uuid); }}
      onPointerOver={() => editor.setHoverEquipo(eq.uuid)} onPointerOut={() => editor.setHoverEquipo(null)}>
      <Equipo3D data={eq} ghost={false} highlight={eq.uuid === editor.seleccionado} onPortClick={editor.modoConexion ? editor.seleccionar : undefined} />
    </group>
  ))}
{editor.fantasmaMover && <Equipo3D ghost data={editor.fantasmaMover} />}
        
        {editor.conexionesResueltas.map(conn => (<TuberiaDinamica key={conn.id} data={conn} />))}
        {editor.fantasma && <Equipo3D ghost data={editor.fantasma} />}
        <OrbitControls makeDefault target={[0, 0.8, 0]} maxPolarAngle={Math.PI * 0.49} minDistance={3} maxDistance={35} />
      </Canvas>

      {/* 3. COMPONENTES DE UI (Reciben los datos y funciones del hook) */}
      <SidebarCatalogo {...editor} />
      {editor.equipoSel && (
  <PanelPropiedades
    equipo={editor.equipoSel}
    onClose={() => editor.setSeleccionado(null)}
    onDelete={editor.eliminarEquipo}
    onMover={editor.iniciarMover}
    modoMover={editor.modoMover}
    onSoltar={editor.soltarMover}
    onCancelarMover={editor.cancelarMover}
  />
)}
      <BarraSuperior cargando={editor.cargando} totalEquipos={editor.equipos.length} puedeUndo={editor.puedeUndo} puedeRedo={editor.puedeRedo} indiceActual={editor.indiceRef.current} pasosHistorial={editor.historialRef.current.length} onUndo={editor.manejarUndoLocal} onRedo={editor.manejarRedoLocal} />
      <TooltipSimulacion hoverEquipo={editor.hoverEquipo} estados={editor.estadosSimulacion} />
      
      {/* BOTÓN FLOTANTE PARA ABRIR EL BOQ */}
      <button
        onClick={() => setMostrarBOQ(!mostrarBOQ)}
        className="absolute bottom-4 left-4 z-10 px-4 py-2 rounded-lg bg-slate-800/95 border border-slate-700 text-xs text-white hover:bg-slate-700 shadow-xl"
      >
        📊 Cómputos Métricos
      </button>
      
      {mostrarBOQ && (
        <PanelBOQ boq={calcularBOQ(editor.equipos, editor.conexionesResueltas)} onClose={() => setMostrarBOQ(false)} />
      )}

      {/* AVISOS Y CARGA */}
      {editor.aviso && (<div className={`absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg max-w-[90vw] border ${editor.aviso.tipo === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' : 'bg-green-900/90 border-green-500 text-green-100'}`}><span className="text-sm">{editor.aviso.texto}</span></div>)}
      {editor.cargando && <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#101820]/90 text-white text-lg">Cargando Gemelo Digital…</div>}
    </main>
  );
}