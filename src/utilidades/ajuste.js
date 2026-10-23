/*
 * Ajuste del Hito 1 al pulso medido por el Arduino (funciones puras).
 *
 * Modelo: ε(t) = -pol · dΦ/dx(x) · v con el movimiento de la simulación referido al instante de
 * cruce t_c (el imán en el centro de la bobina, τ = t - t_c):
 *   caída:     x = v_c·τ + g·τ²/2,  v = v_c + g·τ  (antes de soltarlo, τ < -v_c/g, está quieto)
 *   constante: x = v_c·τ,           v = v_c
 * Incógnitas: v_c (velocidad en el centro), t_c y pol = ±1. Para cada pol se minimiza la suma de
 * cuadrados con Nelder-Mead sobre (v_c, t_c), partiendo de la estimación de los picos medidos:
 * t_c en el punto medio de los picos y v_c = Δx/Δt, con Δx la distancia entre los extremos de
 * dΦ/dx de la bobina. Se queda el pol de menor error. La línea base (V_ref real) es la mediana del
 * voltaje medido: el pulso ocupa una parte pequeña del registro.
 */

import { g } from "../fisica/constantes.js";
import { crearTablaFlujo } from "../fisica/faraday.js";

/* ---------- Utilidades numéricas ---------- */

export function mediana(valores) {
  const orden = Float64Array.from(valores).sort();
  const m = orden.length >> 1;
  return orden.length % 2 ? orden[m] : 0.5 * (orden[m - 1] + orden[m]);
}

/*
 * Nelder-Mead en n dimensiones: f(x) -> número, x0 inicial, pasos del símplex inicial.
 * Devuelve { x, f, iteraciones }.
 */
export function nelderMead(f, x0, pasos, { maxIter = 400, tol = 1e-10 } = {}) {
  const n = x0.length;
  let simplex = [x0, ...pasos.map((h, i) => x0.map((v, j) => (i === j ? v + h : v)))].map((x) => ({ x, f: f(x) }));
  const combinar = (a, b, k) => a.map((v, i) => v + k * (b[i] - v));
  let iter = 0;
  for (; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.f - b.f);
    const mejor = simplex[0];
    const peor = simplex[n];
    if (Math.abs(peor.f - mejor.f) <= tol * (Math.abs(mejor.f) + tol)) break;
    const centro = simplex.slice(0, n).reduce((c, p) => c.map((v, i) => v + p.x[i] / n), new Array(n).fill(0));
    const r = combinar(centro, peor.x, -1);
    const fr = f(r);
    if (fr < mejor.f) {
      const e = combinar(centro, peor.x, -2);
      const fe = f(e);
      simplex[n] = fe < fr ? { x: e, f: fe } : { x: r, f: fr };
    } else if (fr < simplex[n - 1].f) {
      simplex[n] = { x: r, f: fr };
    } else {
      const c = combinar(centro, peor.x, fr < peor.f ? -0.5 : 0.5);
      const fc = f(c);
      if (fc < Math.min(fr, peor.f)) {
        simplex[n] = { x: c, f: fc };
      } else {
        simplex = simplex.map((p, i) => (i === 0 ? p : { x: combinar(mejor.x, p.x, 0.5), f: NaN }));
        for (const p of simplex) if (Number.isNaN(p.f)) p.f = f(p.x);
      }
    }
  }
  simplex.sort((a, b) => a.f - b.f);
  return { x: simplex[0].x, f: simplex[0].f, iteraciones: iter };
}

/* ---------- Pulso medido ---------- */

// Índices del máximo y del mínimo de una serie
function extremos(y) {
  let kMax = 0;
  let kMin = 0;
  for (let k = 1; k < y.length; k++) {
    if (y[k] > y[kMax]) kMax = k;
    if (y[k] < y[kMin]) kMin = k;
  }
  return { kMax, kMin };
}

// FEM medida (voltaje menos la línea base) y sus picos
export function pulsoMedido(medicion) {
  const base = mediana(medicion.V);
  const emf = Float64Array.from(medicion.V, (v) => v - base);
  const { kMax, kMin } = extremos(emf);
  return {
    t: medicion.t,
    emf,
    base,
    picoPositivo: { valor: emf[kMax], t: medicion.t[kMax] },
    picoNegativo: { valor: emf[kMin], t: medicion.t[kMin] },
    deltaT: Math.abs(medicion.t[kMax] - medicion.t[kMin]),
    centro: 0.5 * (medicion.t[kMax] + medicion.t[kMin]),
  };
}

/* ---------- Modelo del pulso ---------- */

// Tabla de dΦ/dx en ±X alrededor de la bobina; fuera de ella el aporte es despreciable (0)
function modeloPulso(sim, tipo) {
  const X = sim.d.X_fin;
  const { dPhi } = crearTablaFlujo(sim.p, sim.d, -X, X);
  const { inicio, h, valores } = dPhi;
  const n = valores.length;
  const derivada = (x) => {
    const pos = (x - inicio) / h;
    if (pos < 0 || pos > n - 1) return 0;
    const k = Math.min(n - 2, Math.floor(pos));
    return valores[k] + (pos - k) * (valores[k + 1] - valores[k]);
  };
  // Distancia entre los extremos de dΦ/dx (separa los dos picos del pulso)
  const { kMax, kMin } = extremos(valores);
  const separacion = Math.abs(kMax - kMin) * h;

  const emf = (tau, vc, pol) => {
    let x;
    let v;
    if (tipo === "caida") {
      if (tau < -vc / g) return 0;   // todavía en la mano
      x = vc * tau + 0.5 * g * tau * tau;
      v = vc + g * tau;
    } else {
      x = vc * tau;
      v = vc;
    }
    return -pol * derivada(x) * v;
  };
  return { emf, separacion };
}

// Suma de cuadrados del modelo contra la FEM medida
function errorCuadratico(modelo, pulso, vc, tc, pol) {
  let suma = 0;
  for (let i = 0; i < pulso.t.length; i++) {
    const e = pulso.emf[i] - modelo.emf(pulso.t[i] - tc, vc, pol);
    suma += e * e;
  }
  return suma;
}

/*
 * Ajusta v_c, t_c y pol al pulso medido con la geometría de la simulación (bobina e imán).
 * Devuelve { ok, tipo, pol, v_centro, t_cruce, x0 (caída), rms, nrmse, r2, base, emfAjustada }
 * o { ok: false, motivo }.
 */
export function ajustarPulso(medicion, sim) {
  const tipo = sim.p.tipoMovimiento;
  if (tipo === "vaiven") return { ok: false, motivo: "El ajuste funciona con caída libre o velocidad constante, no con vaivén." };
  const pulso = pulsoMedido(medicion);
  if (!(pulso.deltaT > 0)) return { ok: false, motivo: "No se encontró un pulso en la medición (los picos coinciden)." };
  const modelo = modeloPulso(sim, tipo);
  const vc0 = modelo.separacion / pulso.deltaT;

  let mejor = null;
  for (const pol of [1, -1]) {
    const objetivo = ([vc, tc]) => (vc > 0 ? errorCuadratico(modelo, pulso, vc, tc, pol) : Infinity);
    const r = nelderMead(objetivo, [vc0, pulso.centro], [0.2 * vc0, 0.2 * pulso.deltaT]);
    if (!mejor || r.f < mejor.f) mejor = { ...r, pol };
  }
  const [v_centro, t_cruce] = mejor.x;
  const emfAjustada = Float64Array.from(pulso.t, (t) => modelo.emf(t - t_cruce, v_centro, mejor.pol));

  const n = pulso.t.length;
  const media = pulso.emf.reduce((s, v) => s + v, 0) / n;
  const total = pulso.emf.reduce((s, v) => s + (v - media) ** 2, 0);
  const rms = Math.sqrt(mejor.f / n);
  const amplitud = pulso.picoPositivo.valor - pulso.picoNegativo.valor;
  return {
    ok: true,
    tipo,
    pol: mejor.pol,
    v_centro,
    t_cruce,
    x0: tipo === "caida" ? -(v_centro * v_centro) / (2 * g) : null,
    rms,
    nrmse: amplitud > 0 ? rms / amplitud : NaN,
    r2: total > 0 ? 1 - mejor.f / total : NaN,
    base: pulso.base,
    emfAjustada,
    iteraciones: mejor.iteraciones,
  };
}

// Cambios de parámetros que llevan el ajuste al gemelo
export function parametrosDelAjuste(ajuste) {
  if (ajuste.tipo === "caida") return { x0: ajuste.x0, pol: ajuste.pol };
  return { v: ajuste.v_centro, pol: ajuste.pol };
}
