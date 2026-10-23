/*
 * Hito 2. Ley de Ampère con un electroimán. CLAUDE.md, "Hito 2".
 *
 * Circuito del boceto con el solenoide en lugar del motor: +12 V → solenoide → colector del
 * TIP120, emisor a GND común, D9 → R_base → base, 1N4007 en antiparalelo con el solenoide.
 * El SS49E frente al extremo del núcleo mide B en A1.
 *
 * Eje z: eje del perno, origen en su centro; el sensor está más allá del extremo +z.
 * La bobina (capas como láminas con K = I/d_hilo) y el núcleo (lámina con K = M) se calculan
 * con campo.js; el campo total es I·b_bob + M·b_nuc.
 */

import { mu0, NUCLEOS } from "./constantes.js";
import { geometriaBobina } from "./bobina.js";
import { campoEjeLamina } from "./campo.js";
import { integrar } from "./cuadratura.js";
import { crearAleatorio, crearRuido, cuantizar } from "./adc.js";
import { regresionLineal, perdidaLinealidad } from "./regresion.js";

// Timer1 del Uno en modo PWM de fase correcta (TOP = 255): 510 tics por periodo y el valor v de
// analogWrite deja la salida en alto 2·v tics, así que D = v/255 exacto.
export const TICS_PERIODO = 510;

export const PARAMETROS_BASE = Object.freeze({
  // Solenoide (devanado sobre el perno: r_int = d_nuc/2)
  N: 120, capas: 3, AWG: 26, R_medida: null, z_bob: 0,
  // Núcleo: "hierro", "acero" o "aire"
  nucleo: "hierro", d_nuc: 7.94e-3, L_nuc: 50e-3,
  // Sensor SS49E (S en V/T: 1.4 mV/G = 14 mV/mT)
  d_sensor: 3e-3, orientacion: 1, S: 14, V_q: 2.5, V_sat_min: 0.86, V_sat_max: 4.21,
  // Electrónica
  V_fuente: 12, R_fuente: 10, R_base: 1000, V_logica: 5, V_BE: 1.4, beta: 1000,
  V_CE_sat: 1.0, V_f: 0.7, V_CEO: 60, con_diodo: true, f_reloj: 16e6, preescala: 64,
  // Barrido (Hito 2 de la guía)
  paso: 10, duracionPaso: 1, lecturasPorPaso: 50, t_lectura: 112e-6,
  // Adquisición en A1
  V_cc: 5, bits: 10, sigma_ruido: 0.5, semilla: 1,
  // Serie temporal para animar y tolerancia del régimen periódico
  dt: 0.01, tolRegimen: 1e-9, maxPeriodos: 2000,
});

export const COLUMNAS = ["t", "D", "I_prom", "M", "B_s", "V_hall", "codigo"];

/* ---------- Derivados ---------- */

// Factor desmagnetizante del elipsoide prolato equivalente (m_r = largo/diámetro > 1)
export function factorDesmagnetizante(m_r) {
  if (!(m_r > 1)) throw new Error("El núcleo debe ser más largo que su diámetro");
  const s = Math.sqrt(m_r * m_r - 1);
  return (1 / (m_r * m_r - 1)) * ((m_r / s) * Math.log(m_r + s) - 1);
}

// Láminas base del campo: bobina por amperio (una por capa) y núcleo por unidad de M
export function fuentesCampo(p, bobina) {
  const capas = bobina.capas.map((capa) => {
    const b = (capa.z.length * bobina.d_hilo) / 2;
    return { a: capa.a, zc: p.z_bob - bobina.L_bob / 2 + b, b, K: 1 / bobina.d_hilo };
  });
  return { bobina: capas, nucleo: { a: p.d_nuc / 2, zc: 0, b: p.L_nuc / 2, K: 1 } };
}

// Bz sobre el eje de una lista de láminas
function ejeLaminas(z, laminas) {
  let Bz = 0;
  for (const l of laminas) Bz += campoEjeLamina(z - l.zc, l.a, l.b, l.K);
  return Bz;
}

export function derivados(p) {
  const bobina = geometriaBobina({ N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.d_nuc / 2, R_medida: p.R_medida });
  const material = NUCLEOS[p.nucleo];
  if (!material) throw new Error(`Núcleo desconocido: ${p.nucleo}`);

  const m_r = p.L_nuc / p.d_nuc;
  const N_d = factorDesmagnetizante(m_r);
  const chi = material.mu_r - 1;
  const chi_a = chi / (1 + N_d * chi);
  const Ms = material.mu0Ms / mu0;
  const L_s = (mu0 * (1 + chi_a) * p.N ** 2 * Math.PI * bobina.r_med ** 2) / bobina.L_bob;

  const T_PWM = (p.preescala * TICS_PERIODO) / p.f_reloj;
  const I_B = (p.V_logica - p.V_BE) / p.R_base;
  const I_C_max = p.beta * I_B;
  const R_on = bobina.R_bob + p.R_fuente;
  const I_on = Math.min((p.V_fuente - p.V_CE_sat) / R_on, I_C_max);

  const fuentes = fuentesCampo(p, bobina);
  // H aplicado al núcleo por amperio: promedio de Bz_bobina/mu0 sobre su eje
  const h_por_A = integrar((z) => ejeLaminas(z, fuentes.bobina), -p.L_nuc / 2, p.L_nuc / 2, 20, 8) / (mu0 * p.L_nuc);
  const z_sensor = p.L_nuc / 2 + p.d_sensor;

  const pasos = [];
  for (let D = 0; D <= 100 + 1e-9; D += p.paso) pasos.push(Math.min(100, D));

  return {
    ...bobina,
    material, m_r, N_d, chi, chi_a, Ms, L_s,
    T_PWM, f_PWM: 1 / T_PWM, I_B, I_C_max, R_on, I_on,
    fuentes, h_por_A, z_sensor,
    bS_bob: ejeLaminas(z_sensor, fuentes.bobina),   // T por A en el sensor
    bS_nuc: ejeLaminas(z_sensor, [fuentes.nucleo]), // T por A/m de M en el sensor
    pasosD: pasos,
    valoresPWM: pasos.map((D) => Math.round((D * 255) / 100)),
  };
}

/* ---------- Núcleo y sensor ---------- */

// Magnetización con saturación de Fröhlich-Kennelly
export function magnetizacion(H, d) {
  if (d.Ms === 0 || d.chi_a === 0) return 0;
  return (d.chi_a * H) / (1 + (d.chi_a * Math.abs(H)) / d.Ms);
}

// Campo en el sensor [T] para una corriente i, con la orientación del sensor
export function campoSensor(i, p, d) {
  const M = magnetizacion(d.h_por_A * i, d);
  return { M, B: p.orientacion * (i * d.bS_bob + M * d.bS_nuc) };
}

export function voltajeHall(B, p) {
  return Math.min(p.V_sat_max, Math.max(p.V_sat_min, p.V_q + p.S * B));
}

/* ---------- Circuito PWM ---------- */

// di/dt según la fase del PWM y el estado del circuito
function derivadaCorriente(i, encendido, p, d) {
  if (encendido) return (p.V_fuente - p.V_CE_sat - d.R_on * i) / d.L_s;
  if (i <= 0) return 0;
  if (p.con_diodo) return -(d.R_bob * i + p.V_f) / d.L_s;      // libre por el diodo
  return (p.V_fuente - p.V_CEO - d.R_on * i) / d.L_s;          // sin diodo: avalancha en V_CEO
}

function acotar(i, p, d) {
  return Math.min(d.I_C_max, Math.max(0, i));
}

function vColectorEmisor(i, encendido, p, d) {
  if (encendido) return i >= d.I_C_max ? p.V_fuente - d.R_on * i : p.V_CE_sat;
  if (i <= 0) return p.V_fuente;
  return p.con_diodo ? p.V_fuente + p.V_f : p.V_CEO;
}

// Un periodo de RK4 con TICS_PERIODO subpasos; si `registro`, guarda i en cada tic
function integrarPeriodo(i0, valor, p, d, registro = null) {
  const h = d.T_PWM / TICS_PERIODO;
  const ticsEncendido = 2 * valor;
  let i = i0;
  if (registro) registro[0] = i;
  for (let k = 0; k < TICS_PERIODO; k++) {
    const encendido = k < ticsEncendido;
    const k1 = derivadaCorriente(i, encendido, p, d);
    const k2 = derivadaCorriente(acotar(i + (h / 2) * k1, p, d), encendido, p, d);
    const k3 = derivadaCorriente(acotar(i + (h / 2) * k2, p, d), encendido, p, d);
    const k4 = derivadaCorriente(acotar(i + h * k3, p, d), encendido, p, d);
    i = acotar(i + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4), p, d);
    if (registro) registro[k + 1] = i;
  }
  return i;
}

/*
 * Régimen periódico para un valor de PWM (0 a 255): integra periodos hasta que la corriente al
 * final iguala a la del inicio y devuelve un periodo representativo con sus promedios.
 */
export function regimenPWM(valor, p, d) {
  let i0 = 0;
  let periodos = 0;
  for (; periodos < p.maxPeriodos; periodos++) {
    const i1 = integrarPeriodo(i0, valor, p, d);
    const cambio = Math.abs(i1 - i0);
    i0 = i1;
    if (cambio < p.tolRegimen) break;
  }

  const n = TICS_PERIODO + 1;
  const i = new Float64Array(n);
  integrarPeriodo(i0, valor, p, d, i);
  const t = new Float64Array(n);
  const vCE = new Float64Array(n);
  const iDiodo = new Float64Array(n);
  const M = new Float64Array(n);
  const B = new Float64Array(n);
  const V_hall = new Float64Array(n);
  let hallRecortado = false;
  const h = d.T_PWM / TICS_PERIODO;
  for (let k = 0; k < n; k++) {
    // El tic k (inicio del subpaso) define la fase; el último punto cierra el periodo
    const encendido = k < 2 * valor || (k === TICS_PERIODO && valor === 255);
    t[k] = k * h;
    vCE[k] = vColectorEmisor(i[k], encendido, p, d);
    iDiodo[k] = !encendido && p.con_diodo ? i[k] : 0;
    const campo = campoSensor(i[k], p, d);
    M[k] = campo.M;
    B[k] = campo.B;
    const V = p.V_q + p.S * campo.B;
    V_hall[k] = voltajeHall(campo.B, p);
    if (V >= p.V_sat_max || V <= p.V_sat_min) hallRecortado = true;
  }

  // Promedio en el periodo (trapecios sobre la malla uniforme de tics)
  const promedio = (serie) => {
    let s = 0.5 * (serie[0] + serie[n - 1]);
    for (let k = 1; k < n - 1; k++) s += serie[k];
    return s / (n - 1);
  };

  return {
    valor,
    periodos,
    periodo: { t, i, vCE, iDiodo, M, B, V_hall },
    I_prom: promedio(i),
    I_max: Math.max(...i),
    I_min: Math.min(...i),
    M_prom: promedio(M),
    B_prom: promedio(B),
    V_hall_prom: promedio(V_hall),
    vCE_max: Math.max(...vCE),
    hallRecortado,
  };
}

/* ---------- Lecturas del Arduino en A1 ---------- */

function interpolarPeriodo(serie, fase) {
  const pos = fase * TICS_PERIODO;
  const k = Math.min(TICS_PERIODO - 1, Math.floor(pos));
  const f = pos - k;
  return serie[k] + f * (serie[k + 1] - serie[k]);
}

// lecturasPorPaso lecturas separadas t_lectura, en fases del PWM que dependen de dónde empieza
function leerSensor(regimen, p, d, ruido, aleatorio) {
  const lsb = p.V_cc / 2 ** p.bits;
  const fase0 = aleatorio();
  let suma = 0;
  for (let k = 0; k < p.lecturasPorPaso; k++) {
    const fase = (fase0 + (k * p.t_lectura) / d.T_PWM) % 1;
    const V = interpolarPeriodo(regimen.periodo.V_hall, fase) + p.sigma_ruido * lsb * ruido();
    suma += cuantizar(V, p.V_cc, p.bits);
  }
  const codigo_prom = suma / p.lecturasPorPaso;
  const V_hall_medido = (codigo_prom + 0.5) * lsb;   // centro del escalón
  return { codigo_prom, V_hall_medido, B_medido: (V_hall_medido - p.V_q) / p.S };
}

/* ---------- Simulación del barrido ---------- */

const UMBRAL_SATURACION_NUCLEO = 0.5;   // M/Ms

export function simular(cambios = {}) {
  const p = { ...PARAMETROS_BASE, ...cambios };
  const d = derivados(p);
  const ruido = crearRuido(p.semilla);
  const aleatorio = crearAleatorio(p.semilla ^ 0x85ebca6b);

  const pasos = d.valoresPWM.map((valor, j) => {
    const regimen = regimenPWM(valor, p, d);
    return { D: d.pasosD[j], ...regimen, ...leerSensor(regimen, p, d, ruido, aleatorio) };
  });

  // Serie temporal: cada paso dura duracionPaso (el régimen se alcanza en milisegundos)
  const duracion = pasos.length * p.duracionPaso;
  const Nt = Math.round(duracion / p.dt) + 1;
  const r = {};
  for (const nombre of COLUMNAS) r[nombre] = new Float64Array(Nt);
  for (let k = 0; k < Nt; k++) {
    const t = k * p.dt;
    const paso = pasos[Math.min(pasos.length - 1, Math.floor(t / p.duracionPaso + 1e-9))];
    r.t[k] = t;
    r.D[k] = paso.D;
    r.I_prom[k] = paso.I_prom;
    r.M[k] = paso.M_prom;
    r.B_s[k] = paso.B_prom;
    r.V_hall[k] = paso.V_hall_prom;
    r.codigo[k] = paso.codigo_prom;
  }

  return { p, d, r, Nt, pasos, eventos: calcularEventos(pasos, p, d) };
}

function calcularEventos(pasos, p, d) {
  const D = pasos.map((s) => s.D);
  const B_medido = pasos.map((s) => s.B_medido);
  const regresion = regresionLineal(D, B_medido);
  const regresionIdeal = regresionLineal(D, pasos.map((s) => s.B_prom));
  const linealidad = perdidaLinealidad(D, B_medido);
  const linealidadCorriente = perdidaLinealidad(D, pasos.map((s) => s.I_prom));

  const M_Ms_max = d.Ms > 0 ? Math.max(...pasos.map((s) => Math.max(...s.periodo.M.map(Math.abs)))) / d.Ms : 0;
  const sensorSaturado = pasos.some((s) => s.hallRecortado);
  const nucleoSaturado = M_Ms_max > UMBRAL_SATURACION_NUCLEO;

  // Causa de la pérdida de linealidad (pregunta 4)
  let causa = null;
  if (linealidad.saturado) {
    if (sensorSaturado) causa = "sensor";
    else if (nucleoSaturado) causa = "nucleo";
    else if (linealidadCorriente.saturado) causa = "circuito";
    else causa = "otra";
  }

  const vCE_max = Math.max(...pasos.map((s) => s.vCE_max));
  return {
    regresion,
    regresionIdeal,
    linealidad,
    linealidadCorriente,
    causa,
    sensorSaturado,
    nucleoSaturado,
    M_Ms_max,
    vCE_max,
    picoSinDiodo: !p.con_diodo && vCE_max >= p.V_CEO,
    I_on: d.I_on,
    limitadaPorTransistor: d.I_on >= d.I_C_max,
  };
}

export function indice(sim, t) {
  const k = Math.round(t / sim.p.dt);
  return Math.max(0, Math.min(sim.Nt - 1, k));
}
