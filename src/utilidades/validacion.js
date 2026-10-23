/*
 * Comparación del gemelo con la medición del Arduino (funciones puras).
 *
 * Hito 1: el pulso medido se alinea con el del gemelo por el instante de cruce (el del ajuste si
 * existe; si no, el punto medio entre los picos de cada uno). Se comparan picos, Δt, el área del
 * pulso y ∫ε dt, y el error RMS punto a punto contra la FEM ideal del gemelo.
 * Hito 2: el gemelo se evalúa en los mismos ciclos de trabajo medidos y se comparan la pendiente
 * y el R² de B contra D, B y V_hall al ciclo máximo y el reposo del sensor. B se calcula como lo
 * haría el Arduino, (V - V_q)/S, con el V_q medido a D = 0 si existe.
 *
 * Cada fila: { nombre, unidad, gemelo, medido, error } con error en % del valor medido, o la
 * diferencia (gemelo - medido) cuando el valor esperado es cercano a cero (fila.diferencia).
 */

import { regresionLineal } from "../fisica/regresion.js";
import { pulsoMedido } from "./ajuste.js";

const TOLERANCIA_D = 0.6;   // ciclos de trabajo que se consideran el mismo paso [%]

// Interpolación lineal de (x, y) en xq; NaN fuera del rango
export function interpolar(x, y, xq) {
  const n = x.length;
  if (!(xq >= x[0] && xq <= x[n - 1])) return NaN;
  let a = 0;
  let b = n - 1;
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (x[m] <= xq) a = m;
    else b = m;
  }
  const f = x[b] > x[a] ? (xq - x[a]) / (x[b] - x[a]) : 0;
  return y[a] + f * (y[b] - y[a]);
}

export function trapecios(t, y) {
  let s = 0;
  for (let i = 1; i < t.length; i++) s += 0.5 * (t[i] - t[i - 1]) * (y[i] + y[i - 1]);
  return s;
}

export const errorPorcentual = (gemelo, medido) => (medido !== 0 && Number.isFinite(medido) ? ((gemelo - medido) / Math.abs(medido)) * 100 : null);

function fila(nombre, unidad, gemelo, medido, diferencia = false) {
  return { nombre, unidad, gemelo, medido, diferencia, error: diferencia ? gemelo - medido : errorPorcentual(gemelo, medido) };
}

// RMS, RMS normalizado por la amplitud medida y R² de pares (gemelo, medido) válidos
function errores(gemelo, medido) {
  let suma = 0;
  let n = 0;
  let media = 0;
  let min = Infinity;
  let max = -Infinity;
  const pares = [];
  for (let i = 0; i < medido.length; i++) {
    if (!Number.isFinite(gemelo[i]) || !Number.isFinite(medido[i])) continue;
    pares.push([gemelo[i], medido[i]]);
    media += medido[i];
    min = Math.min(min, medido[i]);
    max = Math.max(max, medido[i]);
  }
  if (pares.length === 0) return { rms: NaN, nrmse: NaN, r2: NaN, muestras: 0 };
  media /= pares.length;
  let total = 0;
  for (const [a, b] of pares) {
    suma += (a - b) ** 2;
    total += (b - media) ** 2;
    n++;
  }
  const rms = Math.sqrt(suma / n);
  return { rms, nrmse: max > min ? rms / (max - min) : NaN, r2: total > 0 ? 1 - suma / total : NaN, muestras: n };
}

/* ---------- Hito 1 ---------- */

// Instante en que el imán cruza el centro de la bobina (x = 0) en el gemelo; null si no cruza
export function tiempoCruce(r) {
  for (let k = 1; k < r.x.length; k++) {
    if (r.x[k - 1] < 0 && r.x[k] >= 0) return r.t[k - 1] + (-r.x[k - 1] / (r.x[k] - r.x[k - 1])) * (r.t[k] - r.t[k - 1]);
  }
  return null;
}

// Desfase [s] que lleva el tiempo del gemelo al de la medición: t_medido = t_gemelo + desfase
export function desfaseHito1(sim, pulso, ajuste) {
  const { picoPositivo, picoNegativo } = sim.eventos;
  const centroGemelo = 0.5 * (picoPositivo.t + picoNegativo.t);
  const cruce = ajuste ? tiempoCruce(sim.r) : null;
  return cruce !== null ? ajuste.t_cruce - cruce : pulso.centro - centroGemelo;
}

export function validarHito1(sim, medicion, ajuste = null) {
  const pulso = pulsoMedido(medicion);
  const desfase = desfaseHito1(sim, pulso, ajuste);
  const gemeloEnMedicion = Float64Array.from(pulso.t, (t) => interpolar(sim.r.t, sim.r.emf, t - desfase));
  const e = sim.eventos;
  const area = trapecios(pulso.t, pulso.emf.map(Math.abs));
  const filas = [
    fila("Pico positivo", "V", e.picoPositivo.valor, pulso.picoPositivo.valor),
    fila("Pico negativo", "V", e.picoNegativo.valor, pulso.picoNegativo.valor),
    fila("Δt entre picos", "ms", e.deltaT * 1e3, pulso.deltaT * 1e3),
    fila("Área del pulso ∫|ε| dt", "mV·s", e.integralAbsoluta * 1e3, area * 1e3),
    fila("Integral ∫ε dt", "mV·s", e.integral * 1e3, trapecios(pulso.t, pulso.emf) * 1e3, true),
  ];
  return { filas, ...errores(gemeloEnMedicion, pulso.emf), desfase, pulso };
}

/*
 * Medición en la malla del gemelo para superponerla en las gráficas (null fuera del registro):
 * FEM [V] y código ADC.
 */
export function alinearHito1(sim, medicion, ajuste = null) {
  const pulso = pulsoMedido(medicion);
  const desfase = desfaseHito1(sim, pulso, ajuste);
  const emf = new Array(sim.Nt);
  const codigo = new Array(sim.Nt);
  for (let k = 0; k < sim.Nt; k++) {
    const t = sim.r.t[k] + desfase;
    const valor = interpolar(pulso.t, pulso.emf, t);
    emf[k] = Number.isFinite(valor) ? valor : null;
    codigo[k] = Number.isFinite(valor) ? interpolar(pulso.t, medicion.codigos, t) : null;
  }
  return { emf, codigo };
}

/* ---------- Hito 2 ---------- */

// Reposo del sensor: el voltaje medido a D = 0 si existe; si no, el V_q del gemelo
const reposoMedido = (medicion, p) => (medicion.D[0] === 0 ? medicion.V[0] : p.V_q);

// Índice de la medición con el mismo ciclo de trabajo (o -1)
function mismoPaso(D, d) {
  let mejor = -1;
  for (let j = 0; j < D.length; j++) {
    if (Math.abs(D[j] - d) <= TOLERANCIA_D && (mejor < 0 || Math.abs(D[j] - d) < Math.abs(D[mejor] - d))) mejor = j;
  }
  return mejor;
}

export function validarHito2(sim, medicion) {
  const { p, pasos } = sim;
  const Dg = pasos.map((s) => s.D);
  const Vg = pasos.map((s) => s.V_hall_prom);
  const { D, V } = medicion;
  const V_q = reposoMedido(medicion, p);
  const gemeloV = Float64Array.from(D, (d) => interpolar(Dg, Vg, d));
  const validos = Array.from(D.keys()).filter((i) => Number.isFinite(gemeloV[i]));
  if (validos.length < 2) return { ok: false, motivo: "Los ciclos de trabajo medidos no se cruzan con los del gemelo." };

  const Dv = validos.map((i) => D[i]);
  const Bmedido = validos.map((i) => ((V[i] - V_q) / p.S) * 1e3);
  const Bgemelo = validos.map((i) => ((gemeloV[i] - p.V_q) / p.S) * 1e3);
  const rMedido = regresionLineal(Dv, Bmedido);
  const rGemelo = regresionLineal(Dv, Bgemelo);
  const ultimo = validos.length - 1;
  const filas = [
    fila("Pendiente de B contra D", "mT/%", rGemelo.pendiente, rMedido.pendiente),
    fila("R² de la regresión", "", rGemelo.r2, rMedido.r2, true),
    fila(`B a D = ${Dv[ultimo]} %`, "mT", Bgemelo[ultimo], Bmedido[ultimo]),
    fila(`V_hall a D = ${Dv[ultimo]} %`, "V", gemeloV[validos[ultimo]], V[validos[ultimo]]),
    fila("V_hall en reposo", "V", p.V_q, V_q, true),
  ];
  const puntos = validos.map((i, k) => ({ D: D[i], medido: V[i], gemelo: gemeloV[i], Bmedido: Bmedido[k], Bgemelo: Bgemelo[k] }));
  const e = errores(validos.map((i) => gemeloV[i]), validos.map((i) => V[i]));
  return { ok: true, filas, ...e, V_q, regresionMedida: rMedido, regresionGemelo: rGemelo, puntos };
}

/*
 * Medición en la malla del gemelo (null en los pasos sin medición): V_hall [V], B [mT] y código
 * contra el tiempo, y B [mT] en los pasos del barrido para la gráfica de dispersión.
 */
export function alinearHito2(sim, medicion) {
  const { p, r, pasos } = sim;
  const V_q = reposoMedido(medicion, p);
  const deMedicion = (d, f) => {
    const j = mismoPaso(medicion.D, d);
    return j < 0 ? null : f(j);
  };
  const V_hall = new Array(sim.Nt);
  const B_s = new Array(sim.Nt);
  const codigo = new Array(sim.Nt);
  for (let k = 0; k < sim.Nt; k++) {
    V_hall[k] = deMedicion(r.D[k], (j) => medicion.V[j]);
    B_s[k] = deMedicion(r.D[k], (j) => ((medicion.V[j] - V_q) / p.S) * 1e3);
    codigo[k] = deMedicion(r.D[k], (j) => medicion.codigos[j]);
  }
  const dispersion = pasos.map((s) => deMedicion(s.D, (j) => ((medicion.V[j] - V_q) / p.S) * 1e3));
  return { V_hall, B_s, codigo, dispersion };
}
