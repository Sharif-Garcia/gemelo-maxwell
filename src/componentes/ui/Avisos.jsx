/* Avisos de la simulación, centrados bajo la barra de vistas (estado/avisos.js). Cada uno lleva
   icono y texto: el color nunca es la única señal. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { avisosHito } from "../../estado/avisos.js";
import { MEDIDAS, bordesLaterales } from "./medidas.js";
import Icono from "./Icono.jsx";

const ESTILOS = {
  advertencia: "border-amber-300/80 bg-amber-50/90 text-amber-900",
  peligro: "border-red-300/80 bg-red-50/90 text-red-900",
};
const ICONOS = { advertencia: "text-amber-600", peligro: "text-red-600" };

export default function Avisos() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const error = usarGemelo((s) => s.errorSimulacion);
  const paneles = usarGemelo((s) => s.paneles);
  const avisos = avisosHito(hito, sim, error);
  if (avisos.length === 0) return null;
  const { izquierda, derecha } = bordesLaterales(paneles);

  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center gap-1.5"
      style={{ left: izquierda, right: derecha, top: 2 * MEDIDAS.margen + MEDIDAS.altoVistas }}
    >
      {avisos.map((a) => (
        <div
          key={a.id}
          role="status"
          className={"flex max-w-xl items-start gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium shadow-lg backdrop-blur " + ESTILOS[a.nivel]}
        >
          <Icono nombre="alerta" className={"mt-px " + ICONOS[a.nivel]} />
          <span>{a.texto}</span>
        </div>
      ))}
    </div>
  );
}
