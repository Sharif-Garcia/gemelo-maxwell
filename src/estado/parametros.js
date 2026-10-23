/*
 * Parámetros editables de cada hito: grupos, rangos, pasos, unidades y dependencias.
 * Funciones puras (sin React).
 *
 * Los valores se guardan en SI (como los usa el motor). Cada definición numérica indica la
 * unidad de la interfaz y su `escala` (valor mostrado = valor SI × escala); min, max y paso
 * están en unidades de la interfaz. Las opciones (AWG, núcleo, movimiento...) tienen `opciones`.
 *
 * Dependencias:
 * - capas <= N (ambos hitos).
 * - Hito 1: el imán cabe en el tubo con al menos 2 mm de holgura en el diámetro.
 * - Hito 2: el núcleo es más largo que 1.5 veces su diámetro y la bobina cabe en el núcleo
 *   (|z_bob| <= (L_nuc - L_bob)/2).
 */

import { AWG, IMANES, NUCLEOS } from "../fisica/constantes.js";
import { geometriaBobina } from "../fisica/bobina.js";

const opcionesAWG = Object.keys(AWG).map((n) => ({ valor: Number(n), etiqueta: `AWG ${n}` }));

const DEFINICIONES_1 = {
  N: { etiqueta: "Espiras", simbolo: ["N"], unidad: "", min: 20, max: 400, paso: 10, decimales: 0 },
  capas: { etiqueta: "Capas", simbolo: ["capas"], unidad: "", min: 1, max: 8, paso: 1, decimales: 0 },
  AWG: { etiqueta: "Calibre del alambre", simbolo: ["AWG"], opciones: opcionesAWG },
  r_int: { etiqueta: "Radio del tubo", simbolo: ["r", "int"], unidad: "mm", escala: 1e3, min: 5, max: 12, paso: 0.5, decimales: 1 },
  grado: { etiqueta: "Grado del imán", simbolo: ["B", "r"], opciones: Object.values(IMANES).map((i) => ({ valor: i.nombre, etiqueta: `${i.nombre} (${i.Br} T)` })) },
  d_im: { etiqueta: "Diámetro del imán", simbolo: ["d", "im"], unidad: "mm", escala: 1e3, min: 3, max: 22, paso: 0.5, decimales: 1 },
  L_im: { etiqueta: "Largo del imán", simbolo: ["L", "im"], unidad: "mm", escala: 1e3, min: 2, max: 30, paso: 1, decimales: 0 },
  modelo: { etiqueta: "Modelo del imán", simbolo: ["modelo"], opciones: [{ valor: "cilindro", etiqueta: "Cilindro" }, { valor: "dipolo", etiqueta: "Dipolo" }] },
  pol: { etiqueta: "Polaridad", simbolo: ["pol"], opciones: [{ valor: -1, etiqueta: "Entrada positiva" }, { valor: 1, etiqueta: "Entrada negativa" }] },
  tipoMovimiento: {
    etiqueta: "Movimiento", simbolo: ["mov"],
    opciones: [{ valor: "caida", etiqueta: "Caída libre" }, { valor: "constante", etiqueta: "Velocidad constante" }, { valor: "vaiven", etiqueta: "Vaivén" }],
  },
  // Desde -140 mm el imán arranca siempre dentro del tubo (montajeHito1.js)
  x0: { etiqueta: "Posición inicial", simbolo: ["x", "0"], unidad: "mm", escala: 1e3, min: -140, max: -20, paso: 1, decimales: 0, visible: (p) => p.tipoMovimiento !== "vaiven" },
  v: { etiqueta: "Velocidad", simbolo: ["v"], unidad: "m/s", min: 0.1, max: 6, paso: 0.01, decimales: 2, visible: (p) => p.tipoMovimiento === "constante" },
  A: { etiqueta: "Amplitud", simbolo: ["A"], unidad: "mm", escala: 1e3, min: 10, max: 100, paso: 5, decimales: 0, visible: (p) => p.tipoMovimiento === "vaiven" },
  f: { etiqueta: "Frecuencia", simbolo: ["f"], unidad: "Hz", min: 0.2, max: 4, paso: 0.1, decimales: 1, visible: (p) => p.tipoMovimiento === "vaiven" },
  tf_vaiven: { etiqueta: "Duración", simbolo: ["t", "f"], unidad: "s", min: 0.5, max: 5, paso: 0.5, decimales: 1, visible: (p) => p.tipoMovimiento === "vaiven" },
  Ts: { etiqueta: "Periodo de muestreo", simbolo: ["T", "s"], unidad: "ms", escala: 1e3, min: 1, max: 20, paso: 1, decimales: 0 },
  N_filtro: { etiqueta: "Media móvil", simbolo: ["N", "filtro"], opciones: [1, 3, 5, 10].map((n) => ({ valor: n, etiqueta: n === 1 ? "Sin filtro" : `${n} muestras` })) },
  sigma_ruido: { etiqueta: "Ruido", simbolo: ["σ"], unidad: "LSB", min: 0, max: 5, paso: 0.1, decimales: 1 },
  V_ref: { etiqueta: "Referencia del divisor", simbolo: ["V", "ref"], unidad: "V", min: 2, max: 3, paso: 0.01, decimales: 2 },
  V_cc: { etiqueta: "Alimentación del Arduino", simbolo: ["V", "cc"], unidad: "V", min: 4.5, max: 5.5, paso: 0.01, decimales: 2 },
};

const DEFINICIONES_2 = {
  N: { etiqueta: "Espiras", simbolo: ["N"], unidad: "", min: 20, max: 600, paso: 10, decimales: 0 },
  capas: { etiqueta: "Capas", simbolo: ["capas"], unidad: "", min: 1, max: 10, paso: 1, decimales: 0 },
  AWG: { etiqueta: "Calibre del alambre", simbolo: ["AWG"], opciones: opcionesAWG },
  z_bob: { etiqueta: "Posición de la bobina", simbolo: ["z", "bob"], unidad: "mm", escala: 1e3, min: -60, max: 60, paso: 0.5, decimales: 1 },
  nucleo: { etiqueta: "Núcleo", simbolo: ["núcleo"], opciones: Object.entries(NUCLEOS).map(([valor, n]) => ({ valor, etiqueta: n.nombre })) },
  d_nuc: { etiqueta: "Diámetro del núcleo", simbolo: ["d", "nuc"], unidad: "mm", escala: 1e3, min: 2, max: 12, paso: 0.01, decimales: 2 },
  // Hasta 105 mm el perno cabe en el tapete con el sensor a 10 mm (montajeHito2.js)
  L_nuc: { etiqueta: "Largo del núcleo", simbolo: ["L", "nuc"], unidad: "mm", escala: 1e3, min: 15, max: 105, paso: 1, decimales: 0 },
  d_sensor: { etiqueta: "Distancia del sensor", simbolo: ["d", "sensor"], unidad: "mm", escala: 1e3, min: 0.5, max: 10, paso: 0.5, decimales: 1 },
  orientacion: { etiqueta: "Cara del sensor", simbolo: ["orientación"], opciones: [{ valor: 1, etiqueta: "Hacia el norte" }, { valor: -1, etiqueta: "Hacia el sur" }] },
  S: { etiqueta: "Sensibilidad del Hall", simbolo: ["S"], unidad: "mV/mT", min: 10, max: 17.5, paso: 0.1, decimales: 1 },
  V_fuente: { etiqueta: "Voltaje de la fuente", simbolo: ["V", "fuente"], unidad: "V", min: 5, max: 24, paso: 0.5, decimales: 1 },
  R_fuente: { etiqueta: "Resistencia de la fuente", simbolo: ["R", "fuente"], unidad: "Ω", min: 0, max: 20, paso: 0.1, decimales: 1 },
  R_base: { etiqueta: "Resistencia de base", simbolo: ["R", "base"], opciones: [470, 1000, 2200].map((r) => ({ valor: r, etiqueta: r >= 1000 ? `${r / 1000} kΩ` : `${r} Ω` })) },
  beta: { etiqueta: "Ganancia del TIP120", simbolo: ["β"], unidad: "", min: 500, max: 2500, paso: 50, decimales: 0 },
  con_diodo: { etiqueta: "Diodo flyback", simbolo: ["1N4007"], opciones: [{ valor: true, etiqueta: "Con diodo" }, { valor: false, etiqueta: "Sin diodo" }] },
  paso: { etiqueta: "Paso del barrido", simbolo: ["ΔD"], opciones: [5, 10, 20, 25].map((n) => ({ valor: n, etiqueta: `${n} %` })) },
  duracionPaso: { etiqueta: "Duración de cada paso", simbolo: ["t", "paso"], unidad: "s", min: 0.5, max: 3, paso: 0.5, decimales: 1 },
  lecturasPorPaso: { etiqueta: "Lecturas por paso", simbolo: ["n", "lect"], unidad: "", min: 1, max: 200, paso: 1, decimales: 0 },
  sigma_ruido: { etiqueta: "Ruido", simbolo: ["σ"], unidad: "LSB", min: 0, max: 5, paso: 0.1, decimales: 1 },
};

export const DEFINICIONES = { 1: DEFINICIONES_1, 2: DEFINICIONES_2 };

export const GRUPOS = {
  1: [
    { id: "bobina", nombre: "Bobina", parametros: ["N", "capas", "AWG", "r_int"] },
    { id: "iman", nombre: "Imán", parametros: ["grado", "d_im", "L_im", "modelo", "pol"] },
    { id: "movimiento", nombre: "Movimiento", parametros: ["tipoMovimiento", "x0", "v", "A", "f", "tf_vaiven"] },
    { id: "adquisicion", nombre: "Adquisición", parametros: ["Ts", "N_filtro", "sigma_ruido", "V_ref", "V_cc"] },
  ],
  2: [
    { id: "solenoide", nombre: "Solenoide", parametros: ["N", "capas", "AWG", "z_bob"] },
    { id: "nucleo", nombre: "Núcleo", parametros: ["nucleo", "d_nuc", "L_nuc"] },
    { id: "sensor", nombre: "Sensor Hall", parametros: ["d_sensor", "orientacion", "S"] },
    { id: "electronica", nombre: "Electrónica", parametros: ["V_fuente", "R_fuente", "R_base", "beta", "con_diodo"] },
    { id: "barrido", nombre: "Barrido", parametros: ["paso", "duracionPaso", "lecturasPorPaso", "sigma_ruido"] },
  ],
};

export function definicion(hito, nombre) {
  const def = DEFINICIONES[hito][nombre];
  if (!def) throw new Error(`Parámetro desconocido en el hito ${hito}: ${nombre}`);
  return def;
}

export const esOpcion = (def) => Array.isArray(def.opciones);
const escalaDe = (def) => def.escala ?? 1;

// Redondeo al paso en unidades de la interfaz (sin errores de coma flotante)
const alPaso = (valor, paso, decimales) => Number((Math.round(valor / paso) * paso).toFixed(decimales));
const haciaAbajo = (v, paso, decimales) => Number((Math.floor(v / paso + 1e-9) * paso).toFixed(decimales));
const haciaArriba = (v, paso, decimales) => Number((Math.ceil(v / paso - 1e-9) * paso).toFixed(decimales));

// Rango [min, max] en unidades de la interfaz con los demás valores actuales
export function rangoParametro(hito, nombre, p) {
  const def = definicion(hito, nombre);
  let { min, max } = def;
  const e = escalaDe(def);
  if (nombre === "capas") max = Math.min(max, p.N);
  // El imán deja 1 mm de holgura por lado dentro del tubo (pared de 0.6 mm)
  if (hito === 1 && nombre === "d_im") max = Math.min(max, haciaAbajo(2 * p.r_int * e - 2, def.paso, def.decimales));
  if (hito === 2 && nombre === "L_nuc") min = Math.max(min, haciaArriba(1.5 * p.d_nuc * e, def.paso, def.decimales));
  if (hito === 2 && nombre === "z_bob") {
    const { L_bob } = geometriaBobina({ N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.d_nuc / 2 });
    const limite = haciaAbajo(Math.max(0, (p.L_nuc - L_bob) / 2) * e, def.paso, def.decimales);
    min = Math.max(min, -limite);
    max = Math.min(max, limite);
  }
  return { min, max };
}

// Valor SI acotado al rango y al paso del parámetro (las opciones deben ser válidas)
export function acotarValor(hito, nombre, valor, p) {
  const def = definicion(hito, nombre);
  if (esOpcion(def)) {
    if (!def.opciones.some((o) => o.valor === valor)) throw new Error(`Opción no válida para ${nombre}: ${valor}`);
    return valor;
  }
  const e = escalaDe(def);
  const { min, max } = rangoParametro(hito, nombre, p);
  const mostrado = alPaso(Math.min(Math.max(valor * e, min), max), def.paso, def.decimales);
  return Number((Math.min(Math.max(mostrado, min), max) / e).toPrecision(12));
}

// Corrige los parámetros que dependen de otros, en orden de dependencia
export function ajustarDependientes(hito, p) {
  const q = { ...p };
  q.capas = acotarValor(hito, "capas", q.capas, q);
  if (hito === 1) {
    q.d_im = acotarValor(1, "d_im", q.d_im, q);
  } else {
    q.L_nuc = acotarValor(2, "L_nuc", q.L_nuc, q);
    q.z_bob = acotarValor(2, "z_bob", q.z_bob, q);
  }
  return q;
}

// Un parámetro se muestra si no tiene condición o si su condición se cumple
export function esVisible(hito, nombre, p) {
  const { visible } = definicion(hito, nombre);
  return visible ? visible(p) : true;
}

// Valor en unidades de la interfaz
export function valorMostrado(hito, nombre, valorSI) {
  return valorSI * escalaDe(definicion(hito, nombre));
}

// Texto con el formato fijo del parámetro (sin la unidad)
export function formatearValor(hito, nombre, valorSI) {
  const def = definicion(hito, nombre);
  if (esOpcion(def)) return def.opciones.find((o) => o.valor === valorSI)?.etiqueta ?? String(valorSI);
  return valorMostrado(hito, nombre, valorSI).toFixed(def.decimales);
}

// Convierte un valor escrito en unidades de la interfaz a SI
export function desdeMostrado(hito, nombre, valorMostradoUI) {
  return valorMostradoUI / escalaDe(definicion(hito, nombre));
}

// Lee un campo numérico escrito por el usuario (acepta coma decimal); null si no es número
export function leerCampo(texto) {
  const limpio = String(texto).trim().replace(",", ".");
  if (limpio === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(limpio)) return null;
  return Number(limpio);
}
