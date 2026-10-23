/* Parámetro del hito activo (adaptado del polipasto). Numérico: slider y campo sincronizados en
   unidades de la interfaz (mm, ms...), con valor por defecto y botón de restablecer; el campo
   acepta coma o punto y se aplica con Enter o al salir (Escape cancela). De opción: selector.
   Rango, paso, escala y formato salen de estado/parametros.js; si no aplica, no se muestra. */
import { useRef, useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { PARAMETROS_DEFECTO } from "../../estado/escenarios.js";
import {
  definicion, esOpcion, esVisible, rangoParametro, formatearValor, valorMostrado, desdeMostrado, leerCampo,
} from "../../estado/parametros.js";
import Simbolo from "./Simbolo.jsx";
import Icono from "./Icono.jsx";

function Encabezado({ def, id, porDefectoTexto, puedeRestablecer, onRestablecer }) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="flex min-w-0 flex-1 items-baseline gap-2 text-[13px]">
        <Simbolo partes={def.simbolo} className="shrink-0 text-[15px] text-neutral-900" />
        <span className="truncate text-neutral-600" title={def.etiqueta}>{def.etiqueta}</span>
      </label>
      <button
        className="rounded-md p-0.5 text-neutral-500 enabled:hover:bg-neutral-900/5 enabled:hover:text-neutral-900 disabled:opacity-25"
        onClick={onRestablecer}
        disabled={!puedeRestablecer}
        title={`Restablecer (${porDefectoTexto})`}
        aria-label={`Restablecer ${def.etiqueta}`}
      >
        <Icono nombre="restablecer" />
      </button>
    </div>
  );
}

export default function Deslizador({ nombre }) {
  const hito = usarGemelo((s) => s.hito);
  const parametros = usarGemelo((s) => s.parametros);
  const setParametro = usarGemelo((s) => s.setParametro);
  const restablecer = usarGemelo((s) => s.restablecerParametro);
  const [texto, setTexto] = useState(null);   // null: no se está editando
  const cancelar = useRef(false);

  if (!esVisible(hito, nombre, parametros)) return null;
  const def = definicion(hito, nombre);
  const valor = parametros[nombre];
  const porDefecto = PARAMETROS_DEFECTO[hito][nombre];
  const unidad = def.unidad ? ` ${def.unidad}` : "";
  const id = `parametro-${hito}-${nombre}`;
  const encabezado = (
    <Encabezado
      def={def}
      id={id}
      porDefectoTexto={`${formatearValor(hito, nombre, porDefecto)}${unidad}`}
      puedeRestablecer={valor !== porDefecto}
      onRestablecer={() => restablecer(nombre)}
    />
  );

  if (esOpcion(def)) {
    return (
      <div className="py-1.5">
        {encabezado}
        <select
          id={id}
          className="mt-1 w-full rounded-lg border border-neutral-300/80 bg-white/80 px-2 py-1 text-[13px] text-neutral-900 outline-none focus:border-neutral-500"
          value={def.opciones.findIndex((o) => o.valor === valor)}
          onChange={(e) => setParametro(nombre, def.opciones[Number(e.target.value)].valor)}
        >
          {def.opciones.map((o, i) => (
            <option key={String(o.valor)} value={i}>{o.etiqueta}</option>
          ))}
        </select>
      </div>
    );
  }

  const { min, max } = rangoParametro(hito, nombre, parametros);
  const mostrado = valorMostrado(hito, nombre, valor);
  const confirmar = () => {
    const leido = leerCampo(texto ?? "");
    if (!cancelar.current && leido !== null) setParametro(nombre, desdeMostrado(hito, nombre, leido));
    cancelar.current = false;
    setTexto(null);
  };
  const formato = (v) => v.toFixed(def.decimales);

  return (
    <div className="py-1.5">
      {encabezado}
      <div className="mt-0.5 flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <input
            type="range"
            min={min}
            max={max}
            step={def.paso}
            value={mostrado}
            onChange={(e) => setParametro(nombre, desdeMostrado(hito, nombre, Number(e.target.value)))}
            className="block h-1.5 w-full cursor-pointer"
            aria-label={`${def.etiqueta}${unidad}`}
          />
          <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-neutral-400">
            <span>{formato(min)}</span>
            <span>def. {formatearValor(hito, nombre, porDefecto)}</span>
            <span>{formato(max)}</span>
          </div>
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texto ?? formatearValor(hito, nombre, valor)}
          onFocus={(e) => {
            setTexto(formatearValor(hito, nombre, valor));
            e.target.select();
          }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelar.current = true;
              e.currentTarget.blur();
            }
          }}
          className="w-[4.6rem] shrink-0 rounded-md border border-neutral-300/80 bg-white/80 px-1.5 py-0.5 text-right font-mono text-[13px] tabular-nums text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10"
        />
        <span className="w-12 shrink-0 pt-0.5 text-[11px] text-neutral-500">{def.unidad}</span>
      </div>
    </div>
  );
}
