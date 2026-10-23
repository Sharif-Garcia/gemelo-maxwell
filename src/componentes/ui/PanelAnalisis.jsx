/* Panel derecho en modo análisis (reemplaza a los valores en vivo): la ley del hito evaluada en
   el instante (escrita en el DOM con una suscripción, sin renders por cuadro) y las preguntas del
   taller con los resultados del gemelo. Todo sale de analisis/analisis.js. */
import { useEffect, useMemo, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { ecuacionesHito1, ecuacionesHito2, preguntasHito1, preguntaHito2 } from "../../analisis/analisis.js";
import { instanteActual } from "../escena/analisis/solicitudes.js";
import { curvaVelocidadesGuardada, NOMBRES_CAUSA } from "../../graficas/series.js";
import { MEDIDAS } from "./medidas.js";
import PanelLateral from "./PanelLateral.jsx";
import ControlesCampo from "./ControlesCampo.jsx";

const titulo = "mt-3 border-t border-neutral-900/10 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500";
const LINEAS = { 1: 5, 2: 7 };   // líneas máximas de la ecuación (las sobrantes quedan vacías)
const menos = (x, d) => x.toFixed(d).replace(/^-/, "−");

function Pregunta({ numero, titulo: nombre, children }) {
  return (
    <section className="mt-2">
      <h4 className="text-[12px] font-semibold text-neutral-800">P{numero}. {nombre}</h4>
      <div className="mt-0.5 space-y-0.5 text-[12px] leading-snug text-neutral-700">{children}</div>
    </section>
  );
}

const Num = ({ children }) => <span className="font-mono tabular-nums text-neutral-900">{children}</span>;

function PreguntasHito1({ sim }) {
  const curva = curvaVelocidadesGuardada(sim.p);
  const { p1, p2, p3 } = preguntasHito1(sim, curva);
  return (
    <>
      <Pregunta numero={1} titulo="Conservación y simetría">
        <p>∫ε dt = <Num>{menos(p1.integral * 1e3, 4)}</Num> mV·s frente a un área del pulso ∫|ε| dt = <Num>{(p1.area * 1e3).toFixed(3)}</Num> mV·s.</p>
        <p>Es −ΔΦ = −(Φ_fin − Φ_ini) = <Num>{menos(-p1.deltaPhi * 1e3, 4)}</Num> mV·s: el imán empieza y termina lejos, el flujo vuelve a su valor y los dos lóbulos se cancelan.</p>
      </Pregunta>
      <Pregunta numero={2} titulo="Influencia de la velocidad">
        <table className="w-full text-right">
          <thead className="text-[11px] text-neutral-500">
            <tr><th className="text-left font-medium">v [m/s]</th><th className="font-medium">|ε|max [V]</th><th className="font-medium">Δt [ms]</th><th className="font-medium">|ε|·Δt</th></tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {p2.filas.map((f) => (
              <tr key={f.v}><td className="text-left">{f.v.toFixed(1)}</td><td>{f.pico.toFixed(3)}</td><td>{f.deltaT.toFixed(2)}</td><td>{f.producto.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
        <p>Con {p2.razonVelocidades.toFixed(0)} veces la velocidad el pico crece <Num>{p2.razonPicos.toFixed(2)}</Num> veces y Δt se acorta en la misma proporción: ε = −N dΦ/dx · v.</p>
      </Pregunta>
      <Pregunta numero={3} titulo="Rango y cuantización del ADC">
        <p>A0 va de <Num>{p3.A0min.toFixed(3)}</Num> a <Num>{p3.A0max.toFixed(3)}</Num> V (margen <Num>{p3.margenInferior.toFixed(2)}</Num> V abajo y <Num>{p3.margenSuperior.toFixed(2)}</Num> V arriba de 0 a {p3.V_cc} V).</p>
        <p>{p3.saturadas > 0
          ? <>Hay <Num>{p3.saturadas}</Num> muestras recortadas en 0 o 1023: el pico se aplana y el gemelo ya no puede compararse ahí.</>
          : "Ninguna muestra se recorta. Si se pasara de 0 a 5 V el pico se vería plano en 0 o 1023 y se perdería su valor real."}</p>
      </Pregunta>
    </>
  );
}

function PreguntaHito2({ sim }) {
  const q = preguntaHito2(sim);
  return (
    <Pregunta numero={4} titulo="Linealidad y saturación">
      <p>Pendiente <Num>{q.pendiente.toFixed(4)}</Num> mT/% con R² = <Num>{q.r2.toFixed(4)}</Num>. La pendiente final es el <Num>{(q.razon * 100).toFixed(0)}</Num> % de la inicial.</p>
      <p>{q.saturado ? <>Se pierde la linealidad por <strong className="font-semibold">{NOMBRES_CAUSA[q.causa]}</strong>.</> : "La curva se mantiene lineal en todo el barrido."}</p>
      <p>Núcleo: M/Ms máx = <Num>{(q.M_Ms_max * 100).toFixed(1)}</Num> % {q.M_Ms_max > 0.5 ? "(saturado)" : "(lejos de saturar)"}. Sensor: V_hall máx = <Num>{q.V_hall_max.toFixed(3)}</Num> V de {q.V_sat_max} V {q.sensorSaturado ? "(recorta)" : "(sin recortar)"}. Corriente: la final crece al <Num>{(q.razonCorriente * 100).toFixed(0)}</Num> % del ritmo inicial.</p>
    </Pregunta>
  );
}

export default function PanelAnalisis() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const abierto = usarGemelo((s) => s.paneles.valores);
  const alternarPanel = usarGemelo((s) => s.alternarPanel);
  const lineas = useRef([]);
  const filas = useMemo(() => Array.from({ length: LINEAS[hito] }, (_, i) => i), [hito]);

  useEffect(() => {
    if (!abierto) return undefined;
    const pintar = (s) => {
      if (s.hito !== hito) return;
      const a = instanteActual(s);
      const textos = hito === 1 ? ecuacionesHito1(a) : ecuacionesHito2(s.sim, a);
      lineas.current.forEach((el, i) => {
        if (el) el.textContent = textos[i] ?? "";
      });
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [abierto, hito]);

  return (
    <PanelLateral
      lado="derecha"
      titulo="Análisis"
      ancho={MEDIDAS.anchoValores}
      abierto={abierto}
      onAlternar={() => alternarPanel("valores")}
    >
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {hito === 1 ? "Faraday-Lenz en el instante" : "Ampère en el instante"}
      </h3>
      <div className="mt-1 space-y-0.5 font-mono text-[11.5px] leading-snug text-neutral-800">
        {filas.map((i) => <p key={`${hito}-${i}`} ref={(el) => { lineas.current[i] = el; }} className="min-h-[1em]" />)}
      </div>
      <h3 className={titulo}>Preguntas del taller</h3>
      {hito === 1 ? <PreguntasHito1 sim={sim} /> : <PreguntaHito2 sim={sim} />}
      <h3 className={titulo}>Campo magnético</h3>
      <div className="mt-1.5">
        <ControlesCampo />
      </div>
    </PanelLateral>
  );
}
