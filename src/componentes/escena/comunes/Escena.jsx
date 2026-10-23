/* Lienzo 3D (1 unidad = 1 cm): estudio, mesa, cámaras, efectos y el contenido de cada hito. */
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats, PerformanceMonitor } from "@react-three/drei";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import Estudio from "./Estudio.jsx";
import Mesa from "./Mesa.jsx";
import Camaras from "./Camaras.jsx";
import Efectos from "./Efectos.jsx";
import Capturador from "./Capturador.jsx";
import PrimerCuadro from "./PrimerCuadro.jsx";
import CircuitoHito from "./CircuitoHito.jsx";
import MontajeFaraday from "../hito1/MontajeFaraday.jsx";
import MontajeAmpere from "../hito2/MontajeAmpere.jsx";
import CampoMagnetico from "../campo/CampoMagnetico.jsx";
import ModoAnalisis from "../analisis/ModoAnalisis.jsx";

export default function Escena() {
  const mostrarFPS = usarGemelo((s) => s.mostrarFPS);
  const hito = usarGemelo((s) => s.hito);
  const baja = usarGemelo((s) => s.calidad === "baja");
  const setCalidad = usarGemelo((s) => s.setCalidad);
  const compositor = useRef(null);
  return (
    <Canvas
      shadows="percentage"
      dpr={baja ? 1 : [1, 2]}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.1, far: 800, position: [10, 45, 60], manual: true }}
    >
      {/* Si el promedio de cuadros cae bajo el límite, baja la calidad (y la sube si sobra) */}
      <PerformanceMonitor
        onDecline={() => setCalidad("baja")}
        onIncline={() => setCalidad("alta")}
        flipflops={3}
        onFallback={() => setCalidad("baja")}
      />
      <Estudio />
      <Mesa />
      <Camaras />
      <CircuitoHito key={hito} hito={hito} />
      {hito === 1 && <MontajeFaraday />}
      {hito === 2 && <MontajeAmpere />}
      <CampoMagnetico />
      <ModoAnalisis />
      <Efectos ref={compositor} />
      <Capturador compositor={compositor} />
      <PrimerCuadro />
      {mostrarFPS && <Stats />}
    </Canvas>
  );
}
