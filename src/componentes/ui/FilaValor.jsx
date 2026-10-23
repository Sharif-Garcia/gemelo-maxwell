/* Fila del panel de valores: color de la serie (si la tiene), símbolo, nombre, valor y unidad. */
import Simbolo from "./Simbolo.jsx";

export default function FilaValor({ fila, valor, celda, ancho = "w-[4.3rem]" }) {
  return (
    <div className="flex items-center gap-2 py-[2px] text-[12.5px]" title={fila.completo ?? fila.nombre}>
      <span className="h-2.5 w-0.5 shrink-0 rounded-full" style={{ background: fila.color ?? "transparent" }} aria-hidden="true" />
      <Simbolo partes={fila.simbolo} className="w-11 shrink-0 text-[14px] text-neutral-900" />
      <span className="min-w-0 flex-1 truncate text-neutral-600">{fila.nombre}</span>
      <span ref={celda} className={ancho + " shrink-0 text-right font-mono tabular-nums text-neutral-900"}>{valor}</span>
      <span className="w-9 shrink-0 text-[11px] text-neutral-500">{fila.unidad}</span>
    </div>
  );
}
