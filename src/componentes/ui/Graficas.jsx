/* Panel de gráficas plegable debajo de la escena, con las pestañas del hito activo (adaptado del
   polipasto). Las gráficas contra el tiempo apiladas comparten el zoom; las XY (velocidades,
   B contra D y periodo PWM) tienen sus propios ejes. */
import { useMemo, useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import {
  PESTANAS, COLORES, buscarPestana, datosGrafica, marcasEventos, finEje, esRangoCompleto, curvaVelocidadesGuardada,
  datosPeriodo, pasoEnTiempo, clavesConMedicion,
} from "../../graficas/series.js";
import GraficaUPlot from "./GraficaUPlot.jsx";
import GraficaXY from "./GraficaXY.jsx";
import GraficaDispersion from "./GraficaDispersion.jsx";
import PanelValidacion from "./PanelValidacion.jsx";

const ALTO_UNA = 175;      // gráfica sola [px]
const ALTO_APILADA = 62;   // cada gráfica apilada [px]
const EJE_TIEMPO = 44;     // espacio extra de la gráfica que lleva el eje t
const ALTO_XY = 150;

// Velocidad de referencia del instante: la constante o la del cruce por el centro (caída, vaivén)
const marcadorVelocidad = (s) => {
  if (s.hito !== 1) return null;
  return s.sim.p.tipoMovimiento === "constante" ? s.sim.p.v : s.sim.eventos.v_centro;
};

function GraficasVelocidades() {
  const p = usarGemelo((s) => s.sim.p);
  // Solo depende de la bobina y el imán (no del movimiento elegido): se guarda por esos parámetros
  const curva = curvaVelocidadesGuardada(p);
  const seriePico = useMemo(() => [{ nombre: "Pico de la FEM", simbolo: "|ε|max", color: COLORES.azul, y: curva.pico, modo: "linea" }], [curva]);
  const serieDeltaT = useMemo(() => [{ nombre: "Tiempo entre picos", simbolo: "Δt", color: COLORES.naranja, y: curva.deltaT, modo: "linea" }], [curva]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="pl-[56px] text-xs text-neutral-600">
        Imán a velocidad constante a través de la bobina: el pico crece proporcional a v y Δt cae como 1/v (ε = -N dΦ/dt).
      </p>
      <GraficaXY x={curva.v} series={seriePico} etiquetaX="v [m/s]" etiquetaY="|ε|max [V]" alto={ALTO_XY} marcador={marcadorVelocidad} />
      <GraficaXY x={curva.v} series={serieDeltaT} etiquetaX="v [m/s]" etiquetaY="Δt [ms]" alto={ALTO_XY} marcador={marcadorVelocidad} />
    </div>
  );
}

// Fase actual del periodo [ms] en cámara lenta del PWM
const marcadorFase = (s) => (s.hito === 2 && s.camaraLentaPWM ? s.fasePWM * 1e3 : null);

function GraficasPeriodo() {
  const sim = usarGemelo((s) => s.sim);
  // El componente solo se vuelve a dibujar cuando el barrido cambia de paso
  const paso = usarGemelo((s) => (s.hito === 2 ? pasoEnTiempo(s.sim, s.t) : 0));
  const tPaso = paso * sim.p.duracionPaso;
  const datos = useMemo(() => datosPeriodo(sim, tPaso), [sim, tPaso]);
  const serieV = useMemo(() => [{ nombre: "Colector-emisor", simbolo: "v_CE", color: COLORES.azul, y: datos.vCE, modo: "linea" }], [datos]);
  const serieI = useMemo(() => [
    { nombre: "Corriente del solenoide", simbolo: "i", color: COLORES.naranja, y: datos.i, modo: "linea" },
    { nombre: "Corriente por el diodo", simbolo: "i_D", color: COLORES.aqua, y: datos.iDiodo, modo: "linea" },
  ], [datos]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="pl-[56px] text-xs text-neutral-600">
        Un periodo del PWM en régimen para D = {datos.D} % (analogWrite {datos.valor}): el diodo conduce mientras el transistor está apagado.
      </p>
      <GraficaXY x={datos.t} series={serieV} etiquetaX="t dentro del periodo [ms]" etiquetaY="v_CE [V]" alto={ALTO_XY} marcador={marcadorFase} />
      <GraficaXY x={datos.t} series={serieI} etiquetaX="t dentro del periodo [ms]" etiquetaY="i [A]" alto={ALTO_XY} marcador={marcadorFase} />
    </div>
  );
}

export default function Graficas() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const medicion = usarGemelo((s) => s.medicion);
  const [abierto, setAbierto] = useState(true);
  const [pestanas, setPestanas] = useState({ 1: "fem", 2: "dispersion" });
  const [rangos, setRangos] = useState({ 1: null, 2: null });   // null = tiempo completo

  const pestana = buscarPestana(hito, pestanas[hito]);
  const rango = rangos[hito];
  const setRango = (r) => setRangos((anteriores) => ({ ...anteriores, [hito]: r }));
  const marcas = marcasEventos(hito, sim);
  const fin = finEje(hito, sim);
  const zoomActivo = rango !== null && !esRangoCompleto(rango, fin);
  const apiladas = pestana.tipo === "tiempo" && pestana.graficas.length > 1;

  return (
    <section className="shrink-0 border-t border-neutral-200 bg-white/85 backdrop-blur" aria-label="Gráficas">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          <span className={"inline-block transition-transform " + (abierto ? "rotate-90" : "")}>›</span>
          Gráficas
        </button>
        <nav className="flex flex-wrap gap-1" role="tablist">
          {PESTANAS[hito].map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === pestana.id}
              onClick={() => {
                setPestanas((anteriores) => ({ ...anteriores, [hito]: p.id }));
                setAbierto(true);
              }}
              className={
                "rounded-lg px-2.5 py-1 text-xs transition-colors " +
                (p.id === pestana.id ? "bg-neutral-800 text-white" : "text-neutral-600 hover:bg-neutral-100")
              }
            >
              {p.nombre}
            </button>
          ))}
        </nav>
        {pestana.tipo === "tiempo" && (
          <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
            <span className="hidden 2xl:inline">Arrastra para mover el tiempo · rueda o Shift + arrastrar para zoom</span>
            <button
              className="rounded-lg border border-neutral-300 px-2 py-1 text-neutral-700 enabled:hover:bg-neutral-100 disabled:opacity-40"
              onClick={() => setRango(null)}
              disabled={!zoomActivo}
            >
              Restablecer zoom
            </button>
          </div>
        )}
      </header>

      {/* Se pliega animando la altura: el lienzo 3D crece poco a poco y la cámara se reencuadra */}
      <div className={"grid transition-[grid-template-rows] duration-300 ease-out " + (abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden" inert={!abierto}>
          <div className="flex gap-4 px-4 pb-2">
            {pestana.tipo === "tiempo" && (
              <div className="flex min-w-0 flex-1 flex-col">
                {pestana.graficas.map((clavesGemelo, i) => {
                  const claves = clavesConMedicion(hito, clavesGemelo, medicion !== null);
                  const ultima = i === pestana.graficas.length - 1;
                  const alto = (apiladas ? ALTO_APILADA : ALTO_UNA) + (ultima ? EJE_TIEMPO : 0);
                  return (
                    <GraficaUPlot
                      key={`${hito}-${pestana.id}-${claves.join(",")}`}
                      hito={hito}
                      claves={claves}
                      datos={datosGrafica(hito, sim, claves, medicion)}
                      marcas={marcas}
                      rango={rango}
                      alto={alto}
                      ejeTiempo={ultima}
                      etiquetasMarcas={i === 0}
                      compacta={apiladas}
                      onZoom={setRango}
                    />
                  );
                })}
              </div>
            )}
            {pestana.id === "velocidades" && <GraficasVelocidades />}
            {pestana.id === "dispersion" && <div className="min-w-0 flex-1"><GraficaDispersion alto={ALTO_UNA + EJE_TIEMPO} /></div>}
            {pestana.id === "periodo" && <GraficasPeriodo />}
            <PanelValidacion />
          </div>
        </div>
      </div>
    </section>
  );
}
