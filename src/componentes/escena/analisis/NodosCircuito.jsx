/* Nodos del circuito con su tensión en el instante (analisis/analisis.js, nodosHito): un punto
   sobre la ubicación del netlist y una etiqueta que el modo análisis acomoda. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { nodosHito } from "../../../analisis/analisis.js";
import { posicionUbicacion } from "../../../geometria/montaje.js";
import Etiqueta3D from "./Etiqueta3D.jsx";
import { instanteActual, pedirEtiqueta, TAMANO_ETIQUETA } from "./solicitudes.js";

const ALTURA_MARCA = 1.7;      // sobre el agujero: encima del conector DuPont [cm]
const ALTURA_ETIQUETA = 2.5;
const COLOR_NODO = "#1f1f1d";

export default function NodosCircuito({ hito, solicitudes }) {
  const sim = usarGemelo((s) => s.sim);
  // Las ubicaciones no cambian con el instante: se toman con el primero
  const nodos = useMemo(() => {
    const s = usarGemelo.getState();
    return nodosHito(hito, sim, instanteActual(s)).map((n) => ({ id: n.id, punto: posicionUbicacion(hito, n.ubicacion) }));
  }, [hito, sim]);
  const etiquetas = useRef({});

  useFrame(() => {
    const s = usarGemelo.getState();
    if (s.hito !== hito) return;
    const textos = nodosHito(hito, s.sim, instanteActual(s));
    textos.forEach((n, i) => {
      const [x, y, z] = nodos[i].punto;
      pedirEtiqueta(solicitudes, etiquetas.current[n.id], [x, y + ALTURA_ETIQUETA, z], n.texto, { prioridad: 20 + i });
    });
  });

  return (
    <group>
      {nodos.map((n) => (
        <group key={n.id}>
          <mesh position={[n.punto[0], n.punto[1] + ALTURA_MARCA, n.punto[2]]} renderOrder={10}>
            <sphereGeometry args={[0.12, 12, 8]} />
            <meshBasicMaterial color={COLOR_NODO} toneMapped={false} depthTest={false} transparent />
          </mesh>
          <Etiqueta3D ref={(e) => { etiquetas.current[n.id] = e; }} tamanoPx={TAMANO_ETIQUETA} />
        </group>
      ))}
    </group>
  );
}
