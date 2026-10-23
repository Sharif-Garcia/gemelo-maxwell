/*
 * Números del modo análisis (funciones puras): el instante de cada hito para las ecuaciones,
 * las etiquetas y las flechas de la escena, los nodos del circuito y los resultados de las
 * preguntas del taller. Todo sale de la simulación; aquí no se calcula física nueva.
 */

import { interpolar } from "../fisica/faraday.js";
import { TICS_PERIODO } from "../fisica/ampere.js";

const pasoEn = (sim, t) => Math.min(sim.pasos.length - 1, Math.max(0, Math.floor(t / sim.p.duracionPaso + 1e-9)));

/* ---------- Hito 1 ---------- */

/*
 * Instante k del Hito 1. dΦ/dx es la tabla del flujo de la bobina sin pol (el momento del imán
 * apunta en +x, el sentido de la caída). El momento inducido se opone al cambio de ese flujo:
 * sentidoInducido = +1 si apunta como el del imán, -1 si apunta al revés, 0 sin cambio.
 */
export function instanteHito1(sim, k) {
  const { r, p, eventos, tabla } = sim;
  const dPhiDx = interpolar(tabla.dPhi, r.x[k]);
  const dPhiDt = dPhiDx * r.v[k];
  const emfMax = Math.max(Math.abs(eventos.picoPositivo.valor), Math.abs(eventos.picoNegativo.valor));
  return {
    x: r.x[k],
    v: r.v[k],
    Phi: r.Phi[k],
    emf: r.emf[k],
    V_A0: r.V_A0[k],
    codigo: r.codigo[k],
    pol: p.pol,
    N: p.N,
    dPhiDx,
    dPhiDt,
    sentidoInducido: Math.abs(dPhiDt) < 1e-12 ? 0 : -Math.sign(dPhiDt),
    intensidad: emfMax > 0 ? Math.abs(r.emf[k]) / emfMax : 0,
  };
}

/* ---------- Hito 2 ---------- */

// Promedios de las series del periodo que la simulación no guarda (una vez por paso)
const promediosPeriodo = new WeakMap();
function promedioPeriodo(paso) {
  if (!promediosPeriodo.has(paso)) {
    const promedio = (serie) => {
      let s = 0.5 * (serie[0] + serie[TICS_PERIODO]);
      for (let k = 1; k < TICS_PERIODO; k++) s += serie[k];
      return s / TICS_PERIODO;
    };
    promediosPeriodo.set(paso, { iDiodo: promedio(paso.periodo.iDiodo), vCE: promedio(paso.periodo.vCE) });
  }
  return promediosPeriodo.get(paso);
}

/*
 * Instante del Hito 2 en el tiempo t del barrido. En cámara lenta del PWM son los valores del
 * tic de la fase; si no, los promedios del periodo en régimen del paso. La corriente de la
 * fuente es la del transistor: i encendido (0 apagado) o, en promedio, i - i_diodo (Kirchhoff).
 */
export function instanteHito2(sim, t, { camaraLenta = false, fase = 0 } = {}) {
  const { p, d } = sim;
  const paso = sim.pasos[pasoEn(sim, t)];
  const { periodo, valor } = paso;
  let estado;
  if (camaraLenta) {
    const k = Math.min(TICS_PERIODO, Math.max(0, Math.round((fase / d.T_PWM) * TICS_PERIODO)));
    const encendido = k < 2 * valor || (k === TICS_PERIODO && valor === 255);
    const i = periodo.i[k];
    estado = {
      i, iDiodo: periodo.iDiodo[k], iFuente: encendido ? i : 0, vCE: periodo.vCE[k],
      M: periodo.M[k], B: periodo.B[k], V_hall: periodo.V_hall[k], encendido, promedio: false,
    };
  } else {
    const prom = promedioPeriodo(paso);
    estado = {
      i: paso.I_prom, iDiodo: prom.iDiodo, iFuente: paso.I_prom - prom.iDiodo, vCE: prom.vCE,
      M: paso.M_prom, B: paso.B_prom, V_hall: paso.V_hall_prom, encendido: null, promedio: true,
    };
  }
  const iMax = Math.max(d.I_on, 1e-9);
  return {
    ...estado,
    D: paso.D,
    valor,
    N: p.N,
    NI: p.N * estado.i,
    H: d.h_por_A * estado.i,
    M_Ms: d.Ms > 0 ? estado.M / d.Ms : 0,
    V_q: p.V_q,
    S: p.S,
    intensidad: Math.min(1, estado.i / iMax),
    intensidadDiodo: Math.min(1, estado.iDiodo / iMax),
    intensidadFuente: Math.min(1, estado.iFuente / iMax),
  };
}

/* ---------- Nodos del circuito ---------- */

const v = (x, decimales = 2) => x.toFixed(decimales);

// Etiquetas de los nodos con su tensión en el instante (ubicaciones del netlist)
export function nodosHito(hito, sim, instante) {
  const { p } = sim;
  if (hito === 1) {
    return [
      { id: "5V", ubicacion: "arduino:5V", texto: `5 V` },
      { id: "VREF", ubicacion: "pb:c10", texto: `V_ref = ${v(p.V_ref)} V` },
      { id: "A0", ubicacion: "arduino:A0", texto: `A0 = ${v(instante.V_A0, 3)} V (${Math.round(instante.codigo)})` },
      { id: "GND", ubicacion: "arduino:GND1", texto: "GND" },
    ];
  }
  const d9 = instante.promedio ? `D9: PWM ${v(instante.D, 0)} % (${instante.valor})` : `D9 = ${instante.encendido ? "5 V" : "0 V"}`;
  return [
    { id: "D9", ubicacion: "arduino:D9", texto: d9 },
    { id: "COLECTOR", ubicacion: "pb:e21", texto: `${instante.promedio ? "v_CE prom" : "v_CE"} = ${v(instante.vCE)} V` },
    { id: "+12V", ubicacion: "ext:fuente+", texto: `+${v(p.V_fuente, 0)} V` },
    { id: "A1", ubicacion: "arduino:A1", texto: `A1 = ${v(instante.V_hall, 3)} V` },
    { id: "5V", ubicacion: "arduino:5V", texto: "5 V" },
    { id: "GND", ubicacion: "arduino:GND1", texto: "GND" },
  ];
}

/* ---------- Preguntas del taller ---------- */

export const VELOCIDADES_PREGUNTA_2 = [0.5, 1.5, 3];   // lenta, media y rápida [m/s]

/*
 * Hito 1. P1: integral neta, -ΔΦ y área del pulso. P2: pico, Δt y su producto a tres velocidades
 * de la curva de velocidades (curvaVelocidades). P3: hasta dónde llega A0 y el margen al rango.
 */
export function preguntasHito1(sim, curva) {
  const { r, p, eventos, Nt } = sim;
  const filas = VELOCIDADES_PREGUNTA_2.map((vel) => {
    const j = curva.v.findIndex((x) => Math.abs(x - vel) < 1e-9);
    return { v: vel, pico: curva.pico[j], deltaT: curva.deltaT[j], producto: curva.pico[j] * curva.deltaT[j] };
  });
  let A0max = -Infinity;
  let A0min = Infinity;
  for (let k = 0; k < Nt; k++) {
    A0max = Math.max(A0max, r.V_A0[k]);
    A0min = Math.min(A0min, r.V_A0[k]);
  }
  return {
    p1: { integral: eventos.integral, deltaPhi: r.Phi[Nt - 1] - r.Phi[0], area: eventos.integralAbsoluta },
    p2: { filas, razonPicos: filas[2].pico / filas[0].pico, razonVelocidades: filas[2].v / filas[0].v },
    p3: { A0max, A0min, V_cc: p.V_cc, margenSuperior: p.V_cc - A0max, margenInferior: A0min, saturadas: eventos.saturadas },
  };
}

// Hito 2, P4: linealidad de B contra D y su causa
export function preguntaHito2(sim) {
  const { eventos, pasos, p } = sim;
  const ultimo = pasos[pasos.length - 1];
  return {
    pendiente: eventos.regresion.pendiente * 1e3,   // mT/%
    r2: eventos.regresion.r2,
    razon: eventos.linealidad.razon,
    saturado: eventos.linealidad.saturado,
    causa: eventos.causa,
    M_Ms_max: eventos.M_Ms_max,
    sensorSaturado: eventos.sensorSaturado,
    V_hall_max: ultimo.V_hall_prom,
    V_sat_max: p.V_sat_max,
    razonCorriente: eventos.linealidadCorriente.razon,
  };
}

/* ---------- Ecuaciones con los números del instante ---------- */

const suma = (a, b, f) => `${f(a)} ${b < 0 ? "−" : "+"} ${f(Math.abs(b))}`;
const menos = (texto) => texto.replace(/^-/, "−");

// Hito 1: ley de Faraday-Lenz evaluada (líneas de texto)
export function ecuacionesHito1(a) {
  const lenz = a.sentidoInducido < 0 ? "Entra flujo del imán: el campo inducido se le opone"
    : a.sentidoInducido > 0 ? "Sale flujo del imán: el campo inducido lo sostiene" : "El flujo no cambia: no hay FEM";
  return [
    "ε = −N dΦ₁/dt = −pol · (dΦ/dx) · v",
    `= −(${a.pol}) · (${menos(a.dPhiDx.toFixed(4))} Wb/m) · (${a.v.toFixed(3)} m/s)`,
    `= ${menos(a.emf.toFixed(4))} V`,
    `Φ = ${menos((a.Phi * 1e3).toFixed(4))} mWb (las ${a.N} espiras)`,
    lenz,
  ];
}

// Hito 2: de la corriente al voltaje del Hall, paso a paso (ley de Ampère y sensor)
export function ecuacionesHito2(sim, a) {
  const { d, p } = sim;
  const o = p.orientacion;
  const bob = o * a.i * d.bS_bob * 1e3;
  const nuc = o * a.M * d.bS_nuc * 1e3;
  const lineal = a.V_q + a.S * a.B;
  const lineas = [
    `N·I = ${a.N} · ${a.i.toFixed(3)} A = ${a.NI.toFixed(1)} A`,
    `H = h·I = ${d.h_por_A.toFixed(0)} m⁻¹ · ${a.i.toFixed(3)} A = ${(a.H / 1e3).toFixed(2)} kA/m`,
    `M(H) = ${(a.M / 1e3).toFixed(1)} kA/m (M/Ms = ${(a.M_Ms * 100).toFixed(2)} %)`,
    `B_s = I·b_bob + M·b_nuc = ${suma(bob, nuc, (x) => menos(x.toFixed(2)))} = ${menos((a.B * 1e3).toFixed(2))} mT`,
    `V_hall = V_q + S·B = ${a.V_q.toFixed(2)} + ${a.S} · ${menos(a.B.toFixed(5))} = ${lineal.toFixed(3)} V`,
  ];
  if (Math.abs(lineal - a.V_hall) > 5e-4) lineas.push(`recortado por el sensor: V_hall = ${a.V_hall.toFixed(3)} V`);
  if (!a.promedio) lineas.push(a.encendido ? "TIP120 encendido: la fuente carga el solenoide" : `TIP120 apagado: la corriente sigue por el diodo (v_CE = ${a.vCE.toFixed(1)} V)`);
  return lineas;
}
