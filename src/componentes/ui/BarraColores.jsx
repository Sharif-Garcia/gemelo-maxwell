/* Barra de colores de |B|: la misma rampa y escala logarítmica que las líneas y el mapa, con
   marcas en las potencias de 10 (mT). Los textos usan tinta neutra, no el color de la escala. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { RAMPA_AZUL, marcasEscala } from "../escena/campo/rampa.js";

const formatoMT = (mT) => (mT >= 1 ? mT.toFixed(0) : mT.toPrecision(1));

export default function BarraColores() {
  const escala = usarGemelo((s) => s.escalaCampo);
  if (!escala) return null;
  const marcas = marcasEscala(escala);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs text-neutral-600">
        <span>|B|</span>
        <span className="text-neutral-500">escala logarítmica, mT</span>
      </div>
      <div className="h-2.5 rounded-sm" style={{ background: `linear-gradient(to right, ${RAMPA_AZUL.join(", ")})` }} />
      <div className="relative h-4 font-mono text-[11px] text-neutral-600">
        {marcas.map((m) => (
          <span key={m.mT} className="absolute -translate-x-1/2" style={{ left: `${m.t * 100}%` }}>
            {formatoMT(m.mT)}
          </span>
        ))}
      </div>
    </div>
  );
}
