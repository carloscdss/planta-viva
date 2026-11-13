'use client';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState, useEffect } from 'react';
import * as THREE from 'three';

type Equipo = { 
  uuid: string; 
  tag: string; 
  familia: string; 
  posicion: [number, number, number]; 
  color: string; 
  dimensiones: any 
};

const CATALOGO = [
  { familia: 'tanque', tag: 'TNQ', color: '#aaaaaa', dimensiones: { radio: 1, alto: 2.4 }, precio: 1000 },
  { familia: 'bomba', tag: 'BOM', color: '#d97706', dimensiones: { largo: 1, alto: 1, fondo: 1 }, precio: 500 },
  { familia: 'valvula', tag: 'VLV', color: '#ef4444', dimensiones: { radio: 0.3, alto: 0.6 }, precio: 200 },
];

function Equipo3D({ data }: { data: Equipo }) {
  if (data.familia === 'tanque') {
    return (
      <mesh position={data.posicion}>
        <cylinderGeometry args={[data.dimensiones.radio, data.dimensiones.radio, data.dimensiones.alto, 32]} />
        <meshStandardMaterial color={data.color} metalness={0.8} roughness={0.2} />
      </mesh>
    );
  }
  if (data.familia === 'bomba') {
    return (
      <mesh position={data.posicion}>
        <boxGeometry args={[data.dimensiones.largo, data.dimensiones.alto, data.dimensiones.fondo]} />
        <meshStandardMaterial color={data.color} metalness={0.5} roughness={0.5} />
      </mesh>
    );
  }
  if (data.familia === 'valvula') {
    return (
      <mesh position={data.posicion}>
        <cylinderGeometry args={[data.dimensiones.radio, data.dimensiones.radio, data.dimensiones.alto, 16]} />
        <meshStandardMaterial color={data.color} metalness={0.6} roughness={0.4} />
      </mesh>
    );
  }
  return null;
}

function Colocador({ familiaActiva, onColocar }: { familiaActiva: any, onColocar: (pos: [number, number, number]) => void }) {
  const { camera, raycaster, mouse } = useThree();
  const [posicion, setPosicion] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    if (!familiaActiva) { setPosicion(null); return; }

    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const interseccion = new THREE.Vector3();

    const manejarMovimiento = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      
      if (raycaster.ray.intersectPlane(plano, interseccion)) {
        const x = Math.round(interseccion.x * 2) / 2;
        const z = Math.round(interseccion.z * 2) / 2;
        setPosicion([x, familiaActiva.dimensiones.alto / 2, z]);
      }
    };

    const manejarClic = () => {
      if (posicion) {
        onColocar(posicion);
        setPosicion(null);
      }
    };

    window.addEventListener('mousemove', manejarMovimiento);
    window.addEventListener('pointerdown', manejarClic);
    return () => {
      window.removeEventListener('mousemove', manejarMovimiento);
      window.removeEventListener('pointerdown', manejarClic);
    };
  }, [familiaActiva, posicion, camera, raycaster, mouse, onColocar]);

  if (!familiaActiva || !posicion) return null;

  return (
    <group position={posicion}>
      {familiaActiva.familia === 'tanque' && (
        <mesh>
          <cylinderGeometry args={[familiaActiva.dimensiones.radio, familiaActiva.dimensiones.radio, familiaActiva.dimensiones.alto, 32]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      )}
      {familiaActiva.familia === 'bomba' && (
        <mesh>
          <boxGeometry args={[familiaActiva.dimensiones.largo, familiaActiva.dimensiones.alto, familiaActiva.dimensiones.fondo]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      )}
      {familiaActiva.familia === 'valvula' && (
        <mesh>
          <cylinderGeometry args={[familiaActiva.dimensiones.radio, familiaActiva.dimensiones.radio, familiaActiva.dimensiones.alto, 16]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default function Home() {
  const [grafo, setGrafo] = useState<{ equipos: Equipo[] } | null>(null);
  const [familiaActiva, setFamiliaActiva] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarGrafo = () => {
    setCargando(true);
    setErrorMsg(null);
    fetch('/api/grafo')
      .then(async res => {
        if (!res.ok) {
          const texto = await res.text();
          throw new Error(`Error HTTP ${res.status} - ${res.statusText}\n\n${texto.slice(0, 500)}`);
        }
        return res.json();
      })
      .then(data => {
        setGrafo(data.grafo);
        setCargando(false);
      })
      .catch(err => {
        console.error("Error cargando el grafo:", err);
        setErrorMsg(err.message);
        setCargando(false);
      });
  };

  useEffect(() => { cargarGrafo(); }, []);

  const colocarEquipo = async (posicion: [number, number, number]) => {
    if (!familiaActiva) return;
    
    const nuevoEquipo: Equipo = {
      uuid: `e-${Date.now()}`,
      tag: `${familiaActiva.tag}-${Math.floor(Math.random() * 1000)}`,
      familia: familiaActiva.familia,
      color: familiaActiva.color,
      dimensiones: familiaActiva.dimensiones,
      posicion: posicion
    };

    try {
      const res = await fetch('/api/equipos', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(nuevoEquipo) 
      });
      
      if (!res.ok) throw new Error(`Error ${res.status} al guardar equipo`);
      
      cargarGrafo();
      setFamiliaActiva(null);
    } catch (err: any) {
      console.error("Error guardando:", err);
      alert("No se pudo guardar el equipo: " + err.message);
    }
  };

  // --- DIAGNÓSTICO VISUAL ---
  if (cargando) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
        <p className="text-lg">Cargando proyecto desde la Base de Datos...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-screen h-screen bg-slate-900 p-8 overflow-auto">
        <div className="max-w-3xl mx-auto bg-red-900/30 border-2 border-red-500 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold text-red-400 mb-4">⚠️ Error de Diagnóstico</h1>
          <p className="text-sm text-slate-300 mb-4">
            El Frontend no puede comunicarse con la API o la Base de Datos. Revisa los detalles técnicos a continuación:
          </p>
          <pre className="bg-black/50 p-4 rounded text-xs text-red-300 whitespace-pre-wrap overflow-auto font-mono">
            {errorMsg}
          </pre>
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded text-xs text-blue-200">
            <p className="font-bold mb-2">💡 Pasos para diagnosticar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Verifica que el servidor de Next.js esté corriendo (`npm run dev`).</li>
              <li>Ejecuta en la terminal: <code className="bg-black/40 px-1">npx prisma generate</code></li>
              <li>Ejecuta en la terminal: <code className="bg-black/40 px-1">npx prisma db push</code></li>
              <li>Reinicia el servidor con <code className="bg-black/40 px-1">npm run dev</code></li>
              <li>Revisa el terminal para ver el error real que devuelve Prisma.</li>
            </ol>
          </div>
          <button 
            onClick={cargarGrafo}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!grafo) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center text-white">
        <p>No hay datos en el grafo.</p>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen bg-slate-900 relative">
      
      {/* MENÚ LATERAL DE CATÁLOGO */}
      <div className="absolute top-4 left-4 z-10 bg-slate-800 p-4 rounded border border-slate-700 text-white w-64 shadow-xl">
        <h1 className="text-lg font-bold mb-4 text-green-400">Catálogo de Equipos</h1>
        <div className="flex flex-col gap-2">
          {CATALOGO.map(item => (
            <button 
              key={item.familia}
              onClick={() => setFamiliaActiva(item)}
              className={`p-2 rounded text-left border transition ${familiaActiva?.familia === item.familia ? 'bg-green-600 border-green-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
            >
              <div className="font-bold uppercase">{item.familia}</div>
              <div className="text-xs text-slate-300">Costo: ${item.precio}</div>
            </button>
          ))}
        </div>
        {familiaActiva && (
          <p className="text-xs text-yellow-400 mt-4 animate-pulse text-center">
            👆 Haz clic en el suelo para colocar
          </p>
        )}
        {!familiaActiva && (
          <p className="text-xs text-slate-400 mt-4 text-center">
            Selecciona un equipo arriba
          </p>
        )}
      </div>

      {/* LISTA DE EQUIPOS COLOCADOS */}
      <div className="absolute top-4 right-4 z-10 bg-slate-800 p-4 rounded border border-slate-700 text-white min-w-[180px]">
        <h2 className="text-sm font-bold mb-2 text-green-400">Equipos en Planta</h2>
        <p className="text-xs text-slate-400 mb-2">Total: {grafo.equipos.length}</p>
        <ul className="text-xs font-mono space-y-1 max-h-64 overflow-auto">
          {grafo.equipos.map(eq => (
            <li key={eq.uuid} className="border-b border-slate-700 pb-1">
              <span className="text-slate-400">[{eq.familia.toUpperCase()}]</span> {eq.tag}
            </li>
          ))}
        </ul>
      </div>

      {/* ESCENA 3D */}
      <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        {grafo.equipos.map(eq => <Equipo3D key={eq.uuid} data={eq} />)}
        <Colocador familiaActiva={familiaActiva} onColocar={colocarEquipo} />

        <gridHelper args={[40, 40, '#334155', '#1e293b']} />
        <OrbitControls makeDefault />
      </Canvas>
    </main>
  );
}