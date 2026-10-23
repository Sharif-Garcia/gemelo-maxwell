/* Selector de hito (tecla Tab): cada hito conserva sus parámetros, escenario, tiempo y vista. */
import { usarGemelo } from "../../estado/usarGemelo.js";

const HITOS = [
  { hito: 1, nombre: "Hito 1", ley: "Faraday-Lenz" },
  { hito: 2, nombre: "Hito 2", ley: "Ampère" },
];

export default function SelectorHito() {
  const hito = usarGemelo((s) => s.hito);
  const setHito = usarGemelo((s) => s.setHito);
  return (
    <div className="mb-2 grid grid-cols-2 gap-0.5 rounded-xl bg-neutral-900/5 p-0.5" role="tablist" aria-label="Hito (tecla Tab)">
      {HITOS.map((h) => (
        <button
          key={h.hito}
          role="tab"
          aria-selected={h.hito === hito}
          onClick={() => setHito(h.hito)}
          title={`${h.nombre} · ${h.ley} (Tab)`}
          className={
            "rounded-[10px] px-2 py-1.5 text-left leading-tight transition-colors " +
            (h.hito === hito ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-900")
          }
        >
          <span className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500">{h.nombre}</span>
          <span className="block text-[13px] font-semibold">{h.ley}</span>
        </button>
      ))}
    </div>
  );
}
