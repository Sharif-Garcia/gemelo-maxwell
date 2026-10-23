/* Pregunta 4: B que lee el Arduino del gemelo contra el ciclo de trabajo, con la recta de
   regresión, el promedio ideal, R² y la zona donde la curva se aplana con su causa. Con una
   medición real cargada, sus puntos se superponen en tinta oscura. */
import { useMemo } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { COLORES, COLOR_MEDICION, datosDispersion, seriesMedicion, NOMBRES_CAUSA } from "../../graficas/series.js";
import GraficaXY from "./GraficaXY.jsx";

// Ciclo de trabajo del instante actual (Hito 2)
const marcadorD = (s) => (s.hito === 2 ? s.sim.r.D[s.indice] : null);

export default function GraficaDispersion({ alto }) {
  const sim = usarGemelo((s) => s.sim);
  const medicion = usarGemelo((s) => (s.hito === 2 && s.medicion?.datos.hito === 2 ? s.medicion : null));
  const datos = useMemo(() => datosDispersion(sim), [sim]);
  const series = useMemo(() => [
    { nombre: "B en A1 (gemelo)", simbolo: "B_med", color: COLORES.azul, y: datos.medido, modo: "puntos" },
    { nombre: "Recta de regresión", simbolo: "ajuste", color: COLORES.naranja, y: datos.recta, modo: "linea", trazo: [6, 4] },
    { nombre: "Promedio ideal del gemelo", simbolo: "B_prom", color: COLORES.aqua, y: datos.ideal, modo: "linea" },
    ...(medicion
      ? [{ nombre: "B real (CSV)", simbolo: "B_real", color: COLOR_MEDICION, y: seriesMedicion(2, sim, medicion).dispersion, modo: "puntos" }]
      : []),
  ], [datos, sim, medicion]);
  const banda = useMemo(() => {
    if (!sim.eventos.linealidad.saturado) return null;
    const n = datos.D.length;
    // La causa ya figura en el encabezado; en la banda basta con señalar la zona
    return { desde: datos.D[n - 3], hasta: datos.D[n - 1], etiqueta: "se aplana" };
  }, [sim, datos]);

  return (
    <div>
      <p className="pl-[56px] text-xs text-neutral-600">
        Pendiente <span className="font-mono text-neutral-900">{datos.pendiente.toFixed(4)}</span> mT/% · R²{" "}
        <span className="font-mono text-neutral-900">{datos.r2.toFixed(4)}</span>
        {datos.causa && <> · pérdida de linealidad por {NOMBRES_CAUSA[datos.causa]}</>}
      </p>
      <GraficaXY x={datos.D} series={series} etiquetaX="D [%]" etiquetaY="B_s [mT]" alto={alto} marcador={marcadorD} banda={banda} />
    </div>
  );
}
