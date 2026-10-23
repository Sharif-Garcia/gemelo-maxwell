/*
 * Lógica de las gráficas sin DOM (adaptada del polipasto): variables y colores, pestañas por hito,
 * series derivadas en unidades de lectura, marcas de eventos, tiempo de la gráfica, zoom y los
 * datos de las gráficas XY (velocidades, B contra D y periodo PWM).
 *
 * Colores: cada variable tiene uno fijo en todas las pestañas, tomado en orden de la paleta
 * categórica validada (guía de visualización); cuando dos series comparten gráfica usan los dos
 * primeros colores (azul y naranja). Magnitudes con distinta unidad van en gráficas apiladas,
 * nunca con dos ejes y.
 *
 * La medición real del Arduino (Fase 11) se superpone punteada y en tinta oscura sobre la variable
 * del gemelo que mide (MEDIDAS): es otra entidad, así que no toma el color de ninguna variable.
 */

import { MOTORES, duracion } from "../estado/usarGemelo.js";
import { mediaMovil } from "../fisica/adc.js";
import { simular as simularFaraday } from "../fisica/faraday.js";
import { alinearHito1, alinearHito2 } from "../utilidades/validacion.js";

export const COLORES = {
  azul: "#2a78d6",
  naranja: "#eb6834",
  aqua: "#1baf7a",
  amarillo: "#eda100",
};
export const COLOR_MEDICION = "#3d3c38";
const TRAZO_MEDICION = [5, 4];

/* ---------- Variables (columna de origen, escala a la unidad de lectura) ---------- */

export const VARIABLES = {
  1: {
    x: { nombre: "Posición del imán", simbolo: "x", unidad: "mm", color: COLORES.azul, decimales: 2 },
    v: { nombre: "Velocidad", simbolo: "v", unidad: "m/s", color: COLORES.naranja, decimales: 3 },
    Phi: { nombre: "Flujo enlazado", simbolo: "Φ", unidad: "mWb", color: COLORES.aqua, decimales: 4 },
    emf: { nombre: "FEM ideal", simbolo: "ε", unidad: "V", color: COLORES.azul, decimales: 4 },
    emfMedida: { nombre: "FEM medida en A0", simbolo: "ε_med", unidad: "V", color: COLORES.naranja, decimales: 4 },
    codigo: { nombre: "Código ADC", simbolo: "A0", unidad: "", color: COLORES.azul, decimales: 0 },
    codigoFiltrado: { nombre: "Código filtrado", simbolo: "A0_f", unidad: "", color: COLORES.naranja, decimales: 1 },
    integral: { nombre: "Integral acumulada", simbolo: "∫ε dt", unidad: "mV·s", color: COLORES.aqua, decimales: 4 },
    filtro1: { nombre: "Sin filtro", simbolo: "N = 1", unidad: "V", color: COLORES.azul, decimales: 4 },
    filtro3: { nombre: "Media de 3", simbolo: "N = 3", unidad: "V", color: COLORES.naranja, decimales: 4 },
    filtro5: { nombre: "Media de 5", simbolo: "N = 5", unidad: "V", color: COLORES.aqua, decimales: 4 },
    filtro10: { nombre: "Media de 10", simbolo: "N = 10", unidad: "V", color: COLORES.amarillo, decimales: 4 },
    emfReal: { nombre: "FEM real (CSV)", simbolo: "ε_real", unidad: "V", color: COLOR_MEDICION, trazo: TRAZO_MEDICION, decimales: 4 },
    codigoReal: { nombre: "Código real (CSV)", simbolo: "A0_real", unidad: "", color: COLOR_MEDICION, trazo: TRAZO_MEDICION, decimales: 0 },
  },
  2: {
    D: { nombre: "Ciclo de trabajo", simbolo: "D", unidad: "%", color: COLORES.azul, decimales: 0 },
    I_prom: { nombre: "Corriente media", simbolo: "I", unidad: "A", color: COLORES.naranja, decimales: 4 },
    B_s: { nombre: "Campo en el sensor", simbolo: "B_s", unidad: "mT", color: COLORES.aqua, decimales: 3 },
    V_hall: { nombre: "Salida del Hall", simbolo: "V_hall", unidad: "V", color: COLORES.amarillo, decimales: 4 },
    codigo: { nombre: "Código ADC", simbolo: "A1", unidad: "", color: COLORES.azul, decimales: 1 },
    B_sReal: { nombre: "Campo real (CSV)", simbolo: "B_real", unidad: "mT", color: COLOR_MEDICION, trazo: TRAZO_MEDICION, decimales: 3 },
    V_hallReal: { nombre: "V_hall real (CSV)", simbolo: "V_real", unidad: "V", color: COLOR_MEDICION, trazo: TRAZO_MEDICION, decimales: 4 },
    codigoReal: { nombre: "Código real (CSV)", simbolo: "A1_real", unidad: "", color: COLOR_MEDICION, trazo: TRAZO_MEDICION, decimales: 1 },
  },
};

// Variable medida que se superpone a cada variable del gemelo (una por gráfica)
export const MEDIDAS = {
  1: {
    emf: "emfReal", emfMedida: "emfReal", filtro1: "emfReal", filtro3: "emfReal", filtro5: "emfReal", filtro10: "emfReal",
    codigo: "codigoReal", codigoFiltrado: "codigoReal",
  },
  2: { B_s: "B_sReal", V_hall: "V_hallReal", codigo: "codigoReal" },
};

// Variables de una gráfica más la medida que les corresponde, si hay medición
export function clavesConMedicion(hito, claves, hayMedicion) {
  if (!hayMedicion) return claves;
  const medidas = [...new Set(claves.map((c) => MEDIDAS[hito][c]).filter(Boolean))];
  return [...claves, ...medidas];
}

/* ---------- Pestañas ---------- */

// tipo "tiempo": gráficas contra t (listas de variables con la misma unidad); tipo "xy": gráficas propias
export const PESTANAS = {
  1: [
    { id: "movimiento", nombre: "Movimiento x, v", tipo: "tiempo", graficas: [["x"], ["v"]] },
    { id: "flujo", nombre: "Flujo Φ", tipo: "tiempo", graficas: [["Phi"]] },
    { id: "fem", nombre: "FEM ε", tipo: "tiempo", graficas: [["emf", "emfMedida"]] },
    { id: "lectura", nombre: "Lectura A0", tipo: "tiempo", graficas: [["codigo", "codigoFiltrado"]] },
    { id: "integral", nombre: "Integral ∫ε dt", tipo: "tiempo", graficas: [["integral"]] },
    { id: "filtros", nombre: "Filtros N", tipo: "tiempo", graficas: [["filtro1", "filtro3", "filtro5", "filtro10"]] },
    { id: "velocidades", nombre: "Velocidades", tipo: "xy" },
    { id: "todas", nombre: "Todas", tipo: "tiempo", graficas: [["x"], ["Phi"], ["emf"], ["codigo"]] },
  ],
  2: [
    { id: "barrido", nombre: "Barrido D, I", tipo: "tiempo", graficas: [["D"], ["I_prom"]] },
    { id: "campo", nombre: "Campo B_s", tipo: "tiempo", graficas: [["B_s"]] },
    { id: "hall", nombre: "Sensor V_hall", tipo: "tiempo", graficas: [["V_hall"]] },
    { id: "lectura", nombre: "Lectura A1", tipo: "tiempo", graficas: [["codigo"]] },
    { id: "dispersion", nombre: "B contra D", tipo: "xy" },
    { id: "periodo", nombre: "Periodo PWM", tipo: "xy" },
    { id: "todas", nombre: "Todas", tipo: "tiempo", graficas: [["D"], ["I_prom"], ["B_s"], ["V_hall"]] },
  ],
};

export function buscarPestana(hito, id) {
  return PESTANAS[hito].find((p) => p.id === id) ?? PESTANAS[hito][0];
}

/* ---------- Tiempo de la gráfica ---------- */

// El pulso del Hito 1 dura milisegundos: su eje de tiempo va en ms
export const TIEMPO = {
  1: { escala: 1e3, unidad: "ms", rangoMinimo: 0.5 },
  2: { escala: 1, unidad: "s", rangoMinimo: 0.05 },
};

/* ---------- Series derivadas (en unidades de lectura, alineadas con sim.r.t) ---------- */

const cache = new WeakMap();

function escalar(serie, k) {
  const salida = new Float64Array(serie.length);
  for (let i = 0; i < serie.length; i++) salida[i] = serie[i] * k;
  return salida;
}

// Integral acumulada por trapecios
export function integralAcumulada(t, y) {
  const salida = new Float64Array(t.length);
  for (let i = 1; i < t.length; i++) salida[i] = salida[i - 1] + 0.5 * (t[i] - t[i - 1]) * (y[i] + y[i - 1]);
  return salida;
}

// Voltaje medido (centro del escalón del código, menos la referencia) en la malla continua
function emfDeCodigos(codigos, p) {
  const lsb = p.V_cc / 2 ** p.bits;
  return Float64Array.from(codigos, (c) => (c + 0.5) * lsb - p.V_ref);
}

// Código con media móvil de N muestras, retenido en la malla continua (como r.codigo_filtrado)
function filtradoRetenido(sim, N) {
  const { muestras, r, Nt } = sim;
  const filtrado = mediaMovil(muestras.codigo, N);
  const salida = new Float64Array(Nt);
  let m = 0;
  for (let k = 0; k < Nt; k++) {
    while (m + 1 < muestras.n && muestras.t[m + 1] <= r.t[k]) m++;
    salida[k] = filtrado[m];
  }
  return salida;
}

function derivadasHito1(sim) {
  const { r, p } = sim;
  return {
    t: escalar(r.t, TIEMPO[1].escala),
    x: escalar(r.x, 1e3),
    v: r.v,
    Phi: escalar(r.Phi, 1e3),
    emf: r.emf,
    emfMedida: emfDeCodigos(r.codigo_filtrado, p),
    codigo: r.codigo,
    codigoFiltrado: r.codigo_filtrado,
    integral: escalar(integralAcumulada(r.t, r.emf), 1e3),
    filtro1: emfDeCodigos(r.codigo, p),
    filtro3: emfDeCodigos(filtradoRetenido(sim, 3), p),
    filtro5: emfDeCodigos(filtradoRetenido(sim, 5), p),
    filtro10: emfDeCodigos(filtradoRetenido(sim, 10), p),
  };
}

function derivadasHito2(sim) {
  const { r } = sim;
  return { t: r.t, D: r.D, I_prom: r.I_prom, B_s: escalar(r.B_s, 1e3), V_hall: r.V_hall, codigo: r.codigo };
}

// Series en unidades de lectura (se calculan una vez por simulación)
export function seriesDerivadas(hito, sim) {
  if (!cache.has(sim)) cache.set(sim, hito === 1 ? derivadasHito1(sim) : derivadasHito2(sim));
  return cache.get(sim);
}

// Medición alineada con la malla del gemelo (null fuera del registro), una vez por par
const cacheMedicion = new WeakMap();
export function seriesMedicion(hito, sim, medicion) {
  if (!cacheMedicion.has(medicion)) cacheMedicion.set(medicion, new WeakMap());
  const porSim = cacheMedicion.get(medicion);
  if (!porSim.has(sim)) {
    if (hito === 1) {
      const { emf, codigo } = alinearHito1(sim, medicion.datos, medicion.ajuste?.ok ? medicion.ajuste : null);
      porSim.set(sim, { emfReal: emf, codigoReal: codigo });
    } else {
      const { B_s, V_hall, codigo, dispersion } = alinearHito2(sim, medicion.datos);
      porSim.set(sim, { B_sReal: B_s, V_hallReal: V_hall, codigoReal: codigo, dispersion });
    }
  }
  return porSim.get(sim);
}

// Datos en el formato de uPlot: [t, serie1, serie2, ...] (sin copiar)
export function datosGrafica(hito, sim, claves, medicion = null) {
  const s = seriesDerivadas(hito, sim);
  const m = medicion && medicion.datos.hito === hito ? seriesMedicion(hito, sim, medicion) : {};
  return [s.t, ...claves.map((c) => s[c] ?? m[c])];
}

// Etiqueta del eje y: símbolos y unidad común, p. ej. "ε, ε_med [V]"
export function etiquetaEje(hito, claves) {
  const unidad = VARIABLES[hito][claves[0]].unidad;
  const simbolos = claves.map((c) => VARIABLES[hito][c].simbolo).join(", ");
  return unidad ? `${simbolos} [${unidad}]` : simbolos;
}

/* ---------- Marcas de eventos (en unidades del eje de tiempo) ---------- */

export function marcasEventos(hito, sim) {
  const k = TIEMPO[hito].escala;
  if (hito === 1) {
    const e = sim.eventos;
    const [primero, segundo] = [e.picoPositivo, e.picoNegativo].sort((a, b) => a.t - b.t);
    const marcas = [
      { t: primero.t * k, etiqueta: "entrada" },
      { t: segundo.t * k, etiqueta: "salida" },
    ];
    // Cruce del centro de la bobina (primera vez que x pasa por 0)
    const { x, t } = sim.r;
    for (let i = 1; i < x.length; i++) {
      if (x[i - 1] < 0 && x[i] >= 0) {
        marcas.push({ t: t[i] * k, etiqueta: "centro" });
        break;
      }
    }
    return marcas.sort((a, b) => a.t - b.t);
  }
  return sim.pasos.slice(1).map((s, j) => ({ t: (j + 1) * sim.p.duracionPaso, etiqueta: `${s.D} %` }));
}

/* ---------- Tiempo y zoom (en unidades del eje) ---------- */

// Tiempo del eje → tiempo de la simulación [s] acotado, y su índice
export function tiempoEIndice(hito, sim, tEje) {
  const t = Math.min(Math.max(tEje / TIEMPO[hito].escala, 0), duracion(sim));
  return { t, indice: MOTORES[hito].indice(sim, t) };
}

export const finEje = (hito, sim) => duracion(sim) * TIEMPO[hito].escala;

// Acota un rango [min, max] a [0, fin] conservando su ancho si es posible
export function acotarRango(min, max, fin, rangoMinimo) {
  const ancho = Math.min(Math.max(Math.abs(max - min), rangoMinimo), fin);
  let a = Math.min(min, max);
  if (a < 0) a = 0;
  if (a + ancho > fin) a = fin - ancho;
  return { min: a, max: a + ancho };
}

// Zoom con la rueda alrededor del tiempo bajo el puntero (factor < 1 acerca)
export function zoomRueda(rango, tPuntero, factor, fin, rangoMinimo) {
  const min = tPuntero - (tPuntero - rango.min) * factor;
  const max = tPuntero + (rango.max - tPuntero) * factor;
  return acotarRango(min, max, fin, rangoMinimo);
}

export const esRangoCompleto = (rango, fin) => rango.min <= 0 && rango.max >= fin;

/* Fila de cada etiqueta de marca: la primera fila donde no toca a la anterior.
   etiquetas: [{ x, ancho }] ordenadas por x (en píxeles); separación mínima en px. */
export function filasEtiquetas(etiquetas, separacion) {
  const finFila = [];
  return etiquetas.map(({ x, ancho }) => {
    let fila = finFila.findIndex((fin) => x > fin + separacion);
    if (fila < 0) fila = finFila.length;
    finFila[fila] = x + ancho;
    return fila;
  });
}

/* ---------- Gráficas XY ---------- */

export const VELOCIDADES_ENSAYO = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4];

/*
 * Pregunta 2: el mismo imán y la misma bobina a velocidad constante. Devuelve, por velocidad,
 * el pico de la FEM [V] y el tiempo entre picos [ms]. Solo depende de la bobina, el imán y la
 * polaridad (no del movimiento elegido).
 */
export function curvaVelocidades(p) {
  const pico = [];
  const deltaT = [];
  for (const v of VELOCIDADES_ENSAYO) {
    const e = simularFaraday({ ...p, tipoMovimiento: "constante", v, x0: -0.1 }).eventos;
    pico.push(Math.max(Math.abs(e.picoPositivo.valor), Math.abs(e.picoNegativo.valor)));
    deltaT.push(e.deltaT * 1e3);
  }
  return { v: Float64Array.from(VELOCIDADES_ENSAYO), pico: Float64Array.from(pico), deltaT: Float64Array.from(deltaT) };
}

// La curva solo depende de la bobina, el imán y su modelo: se guarda por esos parámetros
const cacheVelocidades = new Map();
const CLAVES_VELOCIDADES = ["N", "capas", "AWG", "r_int", "grado", "d_im", "L_im", "modelo", "V_ref", "V_cc", "Ts"];

export function curvaVelocidadesGuardada(p) {
  const clave = CLAVES_VELOCIDADES.map((c) => p[c]).join("|");
  if (!cacheVelocidades.has(clave)) {
    if (cacheVelocidades.size > 20) cacheVelocidades.clear();
    cacheVelocidades.set(clave, curvaVelocidades(p));
  }
  return cacheVelocidades.get(clave);
}

/*
 * Pregunta 4: B medido por el Arduino contra D, la recta de regresión y el promedio ideal (mT),
 * con R², pendiente y la causa de la pérdida de linealidad.
 */
export function datosDispersion(sim) {
  const { pasos, eventos } = sim;
  const D = Float64Array.from(pasos, (s) => s.D);
  const { pendiente, ordenada, r2 } = eventos.regresion;
  return {
    D,
    medido: Float64Array.from(pasos, (s) => s.B_medido * 1e3),
    recta: Float64Array.from(D, (d) => (ordenada + pendiente * d) * 1e3),
    ideal: Float64Array.from(pasos, (s) => s.B_prom * 1e3),
    r2,
    pendiente: pendiente * 1e3,
    causa: eventos.causa,
  };
}

// Paso del barrido en el instante t [s]
export const pasoEnTiempo = (sim, t) => Math.min(sim.pasos.length - 1, Math.floor(t / sim.p.duracionPaso + 1e-9));

// Un periodo PWM en régimen del paso actual: t en ms, v_CE [V], corrientes [A]
export function datosPeriodo(sim, t) {
  const { periodo, D, valor } = sim.pasos[pasoEnTiempo(sim, t)];
  return { t: escalar(periodo.t, 1e3), vCE: periodo.vCE, i: periodo.i, iDiodo: periodo.iDiodo, D, valor };
}

export const NOMBRES_CAUSA = {
  sensor: "límite del sensor Hall",
  nucleo: "saturación del núcleo",
  circuito: "el circuito (diodo y fuente)",
  otra: "otra causa",
};
