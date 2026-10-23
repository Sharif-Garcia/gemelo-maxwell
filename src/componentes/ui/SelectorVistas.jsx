/* Barra de vistas de cámara del hito activo, centrada sobre el área libre de la escena (teclas 1
   a 5), y el alternador Estudio / Análisis (tecla A). Adaptada del polipasto. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { VISTAS } from "../escena/comunes/vistas.js";
import { MEDIDAS, bordesLaterales } from "./medidas.js";

export default function SelectorVistas() {
  const hito = usarGemelo((s) => s.hito);
  const vista = usarGemelo((s) => s.vista);
  const setVista = usarGemelo((s) => s.setVista);
  const modo = usarGemelo((s) => s.modo);
  const alternarModo = usarGemelo((s) => s.alternarModo);
  const paneles = usarGemelo((s) => s.paneles);
  const { izquierda, derecha } = bordesLaterales(paneles);

  return (
    <div className="pointer-events-none absolute flex justify-center gap-2" style={{ left: izquierda, right: derecha, top: MEDIDAS.margen }}>
      <nav className="vidrio pointer-events-auto flex max-w-full gap-0.5 overflow-x-auto p-1" style={{ height: MEDIDAS.altoVistas }} aria-label="Vistas de cámara">
        {VISTAS[hito].map((v, i) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            aria-pressed={v.id === vista}
            title={`${v.nombre} (tecla ${i + 1})`}
            className={
              "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[13px] transition-colors " +
              (v.id === vista ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900/5")
            }
          >
            <kbd className={"font-mono text-[10px] " + (v.id === vista ? "text-white/60" : "text-neutral-400")}>{i + 1}</kbd>
            {v.nombre}
          </button>
        ))}
      </nav>
      <div className="vidrio pointer-events-auto flex shrink-0 gap-0.5 p-1" style={{ height: MEDIDAS.altoVistas }} role="group" aria-label="Modo de la escena">
        {[["estudio", "Estudio"], ["analisis", "Análisis"]].map(([id, nombre]) => (
          <button
            key={id}
            onClick={() => modo !== id && alternarModo()}
            aria-pressed={modo === id}
            title={`${nombre} (tecla A)`}
            className={
              "whitespace-nowrap rounded-xl px-2.5 text-[13px] transition-colors " +
              (modo === id ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900/5")
            }
          >
            {nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
