/* Sección del campo magnético en el panel derecho: representaciones combinables (C alterna las
   líneas), cantidad de líneas y de planos alrededor del eje, y la barra de colores. */
import { usarGemelo, LIMITES_CAMPO } from "../../estado/usarGemelo.js";
import BarraColores from "./BarraColores.jsx";

const REPRESENTACIONES = [
  { id: "lineas", nombre: "Líneas (C)" },
  { id: "mapa", nombre: "Mapa de |B|" },
  { id: "flechas", nombre: "Flechas" },
  { id: "brujulas", nombre: "Brújulas" },
];

function Cantidad({ nombre, id, valor, setCampo }) {
  const [min, max] = LIMITES_CAMPO[id];
  return (
    <label className="block text-xs text-neutral-600">
      <span className="flex justify-between">
        {nombre} <span className="font-mono text-neutral-800">{valor}</span>
      </span>
      <input type="range" className="w-full" min={min} max={max} step={1} value={valor} onChange={(e) => setCampo(id, Number(e.target.value))} />
    </label>
  );
}

export default function ControlesCampo() {
  const campo = usarGemelo((s) => s.campo);
  const setCampo = usarGemelo((s) => s.setCampo);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {REPRESENTACIONES.map((r) => (
          <label key={r.id} className="flex items-center gap-1.5 text-xs text-neutral-700">
            <input type="checkbox" checked={campo[r.id]} onChange={(e) => setCampo(r.id, e.target.checked)} />
            {r.nombre}
          </label>
        ))}
      </div>
      {campo.lineas && (
        <>
          <Cantidad nombre="Líneas por plano" id="nLineas" valor={campo.nLineas} setCampo={setCampo} />
          <Cantidad nombre="Planos alrededor del eje" id="nPlanos" valor={campo.nPlanos} setCampo={setCampo} />
        </>
      )}
      <BarraColores />
    </div>
  );
}
