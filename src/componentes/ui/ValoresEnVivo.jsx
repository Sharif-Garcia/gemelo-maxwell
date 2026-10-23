/* Panel derecho: valores instantáneos del hito (actualizados en el DOM en cada cuadro, sin
   renders de React), derivados de los parámetros, resultados de la simulación y la sección del
   campo magnético. Formato fijo y cifras tabulares para que los números no salten. En modo
   análisis lo reemplaza PanelAnalisis. */
import { useEffect, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { MEDIDAS } from "./medidas.js";
import { INSTANTANEOS, DERIVADOS, RESULTADOS } from "./valores.js";
import PanelLateral from "./PanelLateral.jsx";
import FilaValor from "./FilaValor.jsx";
import ControlesCampo from "./ControlesCampo.jsx";
import PanelAnalisis from "./PanelAnalisis.jsx";

const titulo = "mt-3 border-t border-neutral-900/10 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500";

export default function ValoresEnVivo() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const abierto = usarGemelo((s) => s.paneles.valores);
  const alternarPanel = usarGemelo((s) => s.alternarPanel);
  const analisis = usarGemelo((s) => s.modo === "analisis");
  const celdas = useRef({});

  useEffect(() => {
    if (!abierto || analisis) return undefined;
    const pintar = (s) => {
      if (s.hito !== hito) return;
      for (const f of INSTANTANEOS[hito]) {
        const celda = celdas.current[f.clave];
        if (celda) celda.textContent = f.leer(s).toFixed(f.decimales);
      }
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [abierto, hito, analisis]);

  if (analisis) return <PanelAnalisis />;
  return (
    <PanelLateral
      lado="derecha"
      titulo="Valores en vivo"
      ancho={MEDIDAS.anchoValores}
      abierto={abierto}
      onAlternar={() => alternarPanel("valores")}
    >
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Instantáneos</h3>
      {INSTANTANEOS[hito].map((f) => (
        <FilaValor key={`${hito}-${f.clave}`} fila={f} celda={(el) => { celdas.current[f.clave] = el; }} />
      ))}
      <h3 className={titulo}>Derivados de los parámetros</h3>
      {DERIVADOS[hito].map((f) => <FilaValor key={f.clave} fila={f} valor={f.valor(sim)} />)}
      <h3 className={titulo}>Resultados</h3>
      {RESULTADOS[hito].map((f) => (
        <FilaValor key={f.clave} fila={f} valor={f.valor(sim)} ancho={f.clave === "causa" ? "w-[7.5rem] text-[11px] whitespace-normal" : undefined} />
      ))}
      <h3 className={titulo}>Campo magnético</h3>
      <div className="mt-1.5">
        <ControlesCampo />
      </div>
    </PanelLateral>
  );
}
