/* Modo presentación (tecla P): tarjeta compacta con cinco valores del hito activo (PRESENTACION
   en valores.js), escritos en el DOM con una suscripción, sin renders por cuadro. */
import { useEffect, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { PRESENTACION } from "./valores.js";
import { MEDIDAS } from "./medidas.js";
import Simbolo from "./Simbolo.jsx";

const NOMBRES = { 1: "Hito 1 · Faraday-Lenz", 2: "Hito 2 · Ampère" };

export default function TarjetaPresentacion() {
  const hito = usarGemelo((s) => s.hito);
  const celdas = useRef({});

  useEffect(() => {
    const pintar = (s) => {
      if (s.hito !== hito) return;
      for (const f of PRESENTACION[hito]) {
        const celda = celdas.current[f.clave];
        if (celda) celda.textContent = f.leer(s).toFixed(f.decimales);
      }
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [hito]);

  return (
    <div className="vidrio absolute px-4 py-3" style={{ left: MEDIDAS.margen, top: MEDIDAS.margen }}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{NOMBRES[hito]}</p>
      <dl className="grid grid-cols-[auto_auto_auto] items-baseline gap-x-3 gap-y-1">
        {PRESENTACION[hito].map((f) => (
          <div key={`${hito}-${f.clave}`} className="contents">
            <dt className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-full" style={{ background: f.color ?? "transparent" }} aria-hidden="true" />
              <Simbolo partes={f.simbolo} className="text-[18px] text-neutral-900" />
            </dt>
            <dd ref={(el) => { celdas.current[f.clave] = el; }} className="text-right font-mono text-[20px] tabular-nums text-neutral-900" />
            <dd className="text-[13px] text-neutral-500">{f.unidad}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-neutral-400">P o Esc: salir de la presentación</p>
    </div>
  );
}
