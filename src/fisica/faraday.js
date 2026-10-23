/*
 * Hito 1. Faraday-Lenz ("Radar Faraday"). CLAUDE.md, "Hito 1".
 *
 * Un imán cilíndrico se mueve sobre el eje de una bobina conectada entre la referencia de
 * 2.5 V y A0. x es la posición del centro del imán respecto al centro de la bobina, positiva en
 * el sentido del movimiento; el imán está magnetizado en +x.
 *
 *   Φ_bob(x) = pol · Σ_espiras Φ_espira(x - z_j)       ε(t) = -dΦ_bob/dx · v(t)
 *
 * El flujo por espira se tabula por capa una sola vez por geometría y la bobina suma sus
 * espiras reales; dΦ/dx sale de la inductancia mutua (exacta, sin derivar numéricamente).
 */

import { mu0, g, IMANES } from "./constantes.js";
import { geometriaBobina } from "./bobina.js";
import { inductanciaMutua } from "./campo.js";
import { integrar } from "./cuadratura.js";
import { adquirir } from "./adc.js";

export const PARAMETROS_BASE = Object.freeze({
  // Bobina
  N: 200, capas: 4, AWG: 28, r_int: 9.0e-3,
  // Imán. pol = -1: el lóbulo de entrada es positivo, como lo describe la guía
  grado: "N42", d_im: 12e-3, L_im: 10e-3, modelo: "cilindro", pol: -1,
  // Movimiento: "constante" (v), "caida" (desde el reposo en x0) o "vaiven" (A, f, tf_vaiven)
  tipoMovimiento: "caida", x0: -0.1, v: 1, A: 0.06, f: 1.5, tf_vaiven: 2,
  // Adquisición (Arduino Uno)
  V_ref: 2.5, V_cc: 5, bits: 10, Ts: 2e-3, N_filtro: 5, sigma_ruido: 0.5, jitter: 0, semilla: 1,
  // Integración y tablas
  dt: 5e-5, paso_tabla: 5e-5,
});

// Columnas de r, en el orden del CSV de exportación
export const COLUMNAS = ["t", "x", "v", "Phi", "emf", "V_A0", "codigo", "codigo_filtrado"];

export function derivados(p) {
  const bobina = geometriaBobina(p);
  const iman = IMANES[p.grado];
  if (!iman) throw new Error(`Grado de imán desconocido: ${p.grado}`);
  const R_im = p.d_im / 2;
  if (R_im >= p.r_int) throw new Error("El imán debe ser más delgado que el interior de la bobina");

  const X_fin = 6 * (bobina.L_bob + p.L_im);   // la simulación termina con el imán a esta distancia
  let tf;
  if (p.tipoMovimiento === "caida") tf = Math.sqrt((2 * (X_fin - p.x0)) / g);
  else if (p.tipoMovimiento === "constante") tf = (X_fin - p.x0) / p.v;
  else if (p.tipoMovimiento === "vaiven") tf = p.tf_vaiven;
  else throw new Error(`Movimiento desconocido: ${p.tipoMovimiento}`);
  if (!(tf > 0)) throw new Error("El imán debe empezar antes del final del recorrido");

  return {
    ...bobina,
    Br: iman.Br,
    R_im,
    K_im: iman.Br / mu0,                                  // corriente superficial equivalente [A/m]
    m: (iman.Br * Math.PI * R_im * R_im * p.L_im) / mu0,  // momento dipolar [A·m²]
    X_fin,
    tf,
  };
}

export function movimiento(t, p) {
  switch (p.tipoMovimiento) {
    case "caida": return { x: p.x0 + 0.5 * g * t * t, v: g * t };
    case "constante": return { x: p.x0 + p.v * t, v: p.v };
    default: {
      const w = 2 * Math.PI * p.f;
      return { x: p.A * Math.sin(w * t), v: p.A * w * Math.cos(w * t) };
    }
  }
}

// Rango de x que recorre el imán
function rangoMovimiento(p, d) {
  if (p.tipoMovimiento === "vaiven") return [-p.A, p.A];
  return [p.x0, d.X_fin];
}

/* ---------- Tablas uniformes ---------- */

function crearTabla(inicio, h, n, f) {
  const valores = new Float64Array(n);
  for (let i = 0; i < n; i++) valores[i] = f(inicio + i * h);
  return { inicio, h, valores };
}

export function interpolar({ inicio, h, valores }, x) {
  const pos = (x - inicio) / h;
  const k = Math.min(valores.length - 2, Math.max(0, Math.floor(pos)));
  const f = pos - k;
  return valores[k] + f * (valores[k + 1] - valores[k]);
}

/* ---------- Flujo de una espira de radio a (u = x - z_espira) ---------- */

// Derivada dΦ/du: exacta para el cilindro (inductancia mutua) y para el dipolo
function derivadaEspira(a, p, d) {
  if (p.modelo === "dipolo") {
    const c = (3 * mu0 * d.m * a * a) / 2;
    return (u) => (-c * u) / Math.pow(a * a + u * u, 2.5);
  }
  const mitad = p.L_im / 2;
  return (u) => d.K_im * (inductanciaMutua(a, d.R_im, u + mitad) - inductanciaMutua(a, d.R_im, u - mitad));
}

// Flujo directo (se usa para el valor inicial de la tabla del cilindro)
function flujoEspira(a, u, p, d) {
  if (p.modelo === "dipolo") return (mu0 * d.m * a * a) / (2 * Math.pow(a * a + u * u, 1.5));
  const mitad = p.L_im / 2;
  return d.K_im * integrar((zeta) => inductanciaMutua(a, d.R_im, u - zeta), -mitad, mitad, 4, 10);
}

/*
 * Suma Σ_j f(x_i - z_j) sobre una malla x_i = xMin + i·h, interpolando linealmente la tabla
 * de la espira (inicio uMin, mismo paso h). Como x y u avanzan con el mismo paso, el desfase
 * fraccionario de cada espira es constante: se calcula una vez y el bucle interno solo suma.
 */
function sumarEspiras(destino, tablaEspira, uMin, h, xMin, z) {
  const n = destino.length;
  const ultimo = tablaEspira.length - 2;
  for (let j = 0; j < z.length; j++) {
    const desfase = (xMin - z[j] - uMin) / h;
    const k0 = Math.floor(desfase);
    const f = desfase - k0;
    const g = 1 - f;
    // El margen de la tabla asegura índices válidos; se acota por seguridad
    const iMax = Math.min(n, ultimo - k0 + 1);
    for (let i = Math.max(0, -k0); i < iMax; i++) {
      destino[i] += g * tablaEspira[i + k0] + f * tablaEspira[i + k0 + 1];
    }
  }
}

/*
 * Tablas de Φ_bob(x) y dΦ_bob/dx (sin pol) en [xMin, xMax]. Por capa se tabula la espira en
 * u y luego se suman las espiras de la capa por interpolación. Φ de la espira se obtiene
 * integrando su derivada exacta (trapecios con paso fino) desde un valor inicial directo.
 */
export function crearTablaFlujo(p, d, xMin, xMax) {
  const h = p.paso_tabla;
  const margen = d.L_bob / 2 + 2 * h;
  const uMin = xMin - margen;
  const nU = Math.ceil((xMax - xMin + 2 * margen) / h) + 1;
  const nX = Math.ceil((xMax - xMin) / h) + 1;
  const Phi = new Float64Array(nX);
  const dPhi = new Float64Array(nX);

  for (const capa of d.capas) {
    const dEspira = crearTabla(uMin, h, nU, derivadaEspira(capa.a, p, d));
    const fEspira = { inicio: uMin, h, valores: new Float64Array(nU) };
    fEspira.valores[0] = flujoEspira(capa.a, uMin, p, d);
    for (let i = 1; i < nU; i++) {
      fEspira.valores[i] = fEspira.valores[i - 1] + 0.5 * h * (dEspira.valores[i - 1] + dEspira.valores[i]);
    }
    sumarEspiras(Phi, fEspira.valores, uMin, h, xMin, capa.z);
    sumarEspiras(dPhi, dEspira.valores, uMin, h, xMin, capa.z);
  }
  return { Phi: { inicio: xMin, h, valores: Phi }, dPhi: { inicio: xMin, h, valores: dPhi } };
}

/*
 * dΦ/dx del modelo dipolo para una bobina de una capa continua (radio a, largo L, N espiras).
 * Fórmula cerrada de CLAUDE.md, usada como referencia en las pruebas.
 */
export function dPhiDipoloContinuo(x, a, L, N, m) {
  const f = (u) => (a * a) / Math.pow(a * a + u * u, 1.5);
  return ((mu0 * m * N) / (2 * L)) * (f(x + L / 2) - f(x - L / 2));
}

/* ---------- Eventos y métricas (preguntas 1 a 3 del taller) ---------- */

function trapecios(t, y) {
  let suma = 0;
  for (let k = 1; k < t.length; k++) suma += 0.5 * (t[k] - t[k - 1]) * (y[k] + y[k - 1]);
  return suma;
}

function extremo(serie, signo) {
  let k = 0;
  for (let i = 1; i < serie.length; i++) if (signo * serie[i] > signo * serie[k]) k = i;
  return k;
}

// Ancho a media altura del lóbulo que contiene el índice k
function anchoMediaAltura(t, y, k) {
  const mitad = y[k] / 2;
  const supera = (i) => (mitad > 0 ? y[i] >= mitad : y[i] <= mitad);
  let i = k;
  while (i > 0 && supera(i - 1)) i--;
  let j = k;
  while (j < y.length - 1 && supera(j + 1)) j++;
  const cruce = (a, b) => t[a] + ((mitad - y[a]) / (y[b] - y[a])) * (t[b] - t[a]);
  const inicio = i > 0 ? cruce(i - 1, i) : t[0];
  const fin = j < y.length - 1 ? cruce(j, j + 1) : t[y.length - 1];
  return fin - inicio;
}

function calcularEventos(r, muestras, p) {
  const kPos = extremo(r.emf, 1);
  const kNeg = extremo(r.emf, -1);
  const kMayor = Math.abs(r.emf[kPos]) >= Math.abs(r.emf[kNeg]) ? kPos : kNeg;

  let v_centro = null;
  for (let k = 1; k < r.x.length; k++) {
    if (r.x[k - 1] < 0 && r.x[k] >= 0) {
      const f = -r.x[k - 1] / (r.x[k] - r.x[k - 1]);
      v_centro = r.v[k - 1] + f * (r.v[k] - r.v[k - 1]);
      break;
    }
  }

  const emfMedida = muestras.emfMedida;
  const mPos = extremo(emfMedida, 1);
  const mNeg = extremo(emfMedida, -1);
  const absEmf = r.emf.map(Math.abs);

  return {
    picoPositivo: { valor: r.emf[kPos], t: r.t[kPos], x: r.x[kPos] },
    picoNegativo: { valor: r.emf[kNeg], t: r.t[kNeg], x: r.x[kNeg] },
    deltaT: Math.abs(r.t[kNeg] - r.t[kPos]),
    anchoMediaAltura: anchoMediaAltura(r.t, r.emf, kMayor),
    integral: trapecios(r.t, r.emf),
    integralTeorica: -(r.Phi[r.Phi.length - 1] - r.Phi[0]),
    integralAbsoluta: trapecios(r.t, absEmf),
    integralMedida: trapecios(muestras.t, emfMedida),
    picoMedidoPositivo: { valor: emfMedida[mPos], t: muestras.t[mPos] },
    picoMedidoNegativo: { valor: emfMedida[mNeg], t: muestras.t[mNeg] },
    saturadas: muestras.saturadas,
    v_centro,
    V_ref: p.V_ref,
  };
}

/* ---------- Simulación ---------- */

export function simular(cambios = {}) {
  const p = { ...PARAMETROS_BASE, ...cambios };
  const d = derivados(p);
  const Nt = Math.round(d.tf / p.dt) + 1;
  const [xMin, xMax] = rangoMovimiento(p, d);
  const tabla = crearTablaFlujo(p, d, xMin - 2 * p.paso_tabla, xMax + 2 * p.paso_tabla);

  const r = {};
  for (const nombre of COLUMNAS) r[nombre] = new Float64Array(Nt);
  for (let k = 0; k < Nt; k++) {
    const t = k * p.dt;
    const { x, v } = movimiento(t, p);
    r.t[k] = t;
    r.x[k] = x;
    r.v[k] = v;
    r.Phi[k] = p.pol * interpolar(tabla.Phi, x);
    r.emf[k] = -p.pol * interpolar(tabla.dPhi, x) * v;
    r.V_A0[k] = p.V_ref + r.emf[k];
  }

  // Lo que lee el Arduino en A0
  const adq = adquirir(r.V_A0, p.dt, p);
  const lsb = p.V_cc / 2 ** p.bits;
  // Voltaje medido: centro del escalón del código, menos la referencia
  const emfMedida = adq.filtrado.map((c) => (c + 0.5) * lsb - p.V_ref);
  const muestras = { ...adq, emfMedida };

  // Retención de orden cero de los códigos en la malla continua (para la escena y el CSV)
  let m = 0;
  for (let k = 0; k < Nt; k++) {
    while (m + 1 < adq.n && adq.t[m + 1] <= r.t[k]) m++;
    r.codigo[k] = adq.codigo[m];
    r.codigo_filtrado[k] = adq.filtrado[m];
  }

  return { p, d, r, Nt, tabla, muestras, eventos: calcularEventos(r, muestras, p) };
}

// Índice de la muestra continua para un tiempo de reproducción
export function indice(sim, t) {
  const k = Math.round(t / sim.p.dt);
  return Math.max(0, Math.min(sim.Nt - 1, k));
}
