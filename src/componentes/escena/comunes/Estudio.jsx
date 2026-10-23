/* Estudio fotográfico a escala de mesa (1 unidad = 1 cm): ciclorama claro (piso y pared con
   curva continua), iluminación de estudio y sombras suaves. Adaptado del polipasto (×10). */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { PlaneGeometry } from "three";
import { Environment, ContactShadows } from "@react-three/drei";
import { usarGemelo } from "../../../estado/usarGemelo.js";

// HDR de estudio local (Poly Haven, CC0): la escena se ilumina igual sin conexión
const HDR_ESTUDIO = `${import.meta.env.BASE_URL}hdri/studio_small_03_1k.hdr`;

export const COLOR_ESTUDIO = "#e8e8eb";

// Perfil del ciclorama en el plano (z, y) [cm]
const ANCHO = 800;         // a lo largo de x (bordes ocultos por la niebla)
const FONDO_PISO = 250;    // piso desde z = +220 hasta el inicio de la curva (z = -30)
const Z_FRENTE = 220;      // más allá de la distancia máxima de la cámara: el borde nunca se ve
const RADIO_CURVA = 25;
const ALTO_PARED = 80;

function crearCiclorama() {
  const largoCurva = (Math.PI / 2) * RADIO_CURVA;
  const largoTotal = FONDO_PISO + largoCurva + ALTO_PARED;
  const geometria = new PlaneGeometry(ANCHO, largoTotal, 1, 240);
  const pos = geometria.attributes.position;
  const zInicioCurva = Z_FRENTE - FONDO_PISO;

  // Cada vértice se ubica según su distancia s a lo largo del perfil
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getY(i) + largoTotal / 2;
    let y, z;
    if (s <= FONDO_PISO) {
      y = 0;
      z = Z_FRENTE - s;
    } else if (s <= FONDO_PISO + largoCurva) {
      const ang = (s - FONDO_PISO) / RADIO_CURVA;
      y = RADIO_CURVA * (1 - Math.cos(ang));
      z = zInicioCurva - RADIO_CURVA * Math.sin(ang);
    } else {
      y = RADIO_CURVA + (s - FONDO_PISO - largoCurva);
      z = zInicioCurva - RADIO_CURVA;
    }
    pos.setXYZ(i, pos.getX(i), y, z);
  }
  geometria.computeVertexNormals();
  return geometria;
}

export default function Estudio() {
  const baja = usarGemelo((s) => s.calidad === "baja");
  const luz = useRef(null);
  const tamanoSombra = baja ? 1024 : 2048;

  // Al cambiar la calidad se rehace el mapa de sombras con el nuevo tamaño
  useEffect(() => {
    const sombra = luz.current?.shadow;
    if (!sombra) return;
    sombra.mapSize.set(tamanoSombra, tamanoSombra);
    sombra.map?.dispose();
    sombra.map = null;
  }, [tamanoSombra]);

  const ciclorama = useMemo(() => crearCiclorama(), []);

  return (
    <>
      <color attach="background" args={[COLOR_ESTUDIO]} />
      {/* La niebla empieza más allá de la distancia máxima de la cámara (210 cm) */}
      <fog attach="fog" args={[COLOR_ESTUDIO, 260, 460]} />

      {/* El HDR se carga suspendiendo: con su propio límite el resto de la escena (cámaras,
          mesa, montajes) se monta de inmediato en lugar de esperar un nuevo render */}
      <Suspense fallback={null}>
        <Environment files={HDR_ESTUDIO} environmentIntensity={0.35} />
      </Suspense>
      <ambientLight intensity={0.08} />
      <directionalLight
        position={[-40, 70, 30]}   // desde la izquierda: la sombra cae hacia la cámara general
        intensity={3.4}
        castShadow
        ref={luz}
        shadow-mapSize={[tamanoSombra, tamanoSombra]}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-35}
        shadow-camera-near={10}
        shadow-camera-far={200}
      />

      <mesh geometry={ciclorama} receiveShadow>
        <meshStandardMaterial color={COLOR_ESTUDIO} roughness={0.95} metalness={0} />
      </mesh>

      {/* Solo los objetos cercanos al piso (far) oscurecen el contacto */}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.75}
        scale={90}
        blur={1.2}
        far={12}
        resolution={baja ? 512 : 1024}
      />
    </>
  );
}
