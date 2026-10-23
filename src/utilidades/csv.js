/*
 * Lectura de los CSV del Arduino y escritura del CSV del gemelo (funciones puras, sin DOM).
 * Formatos en CLAUDE.md, "Formatos de datos (CSV)".
 *
 * El lector es tolerante con lo que imprime el monitor serie: separador coma, punto y coma o
 * tabulador (con coma decimal en los dos últimos), mayúsculas, tildes y espacios en el
 * encabezado, columnas en otro orden, líneas START/STOP y texto antes del encabezado. Los
 * errores dicen la fila y la columna.
 */

import { aVoltaje } from "../fisica/adc.js";
import { COLUMNAS as COLUMNAS_1 } from "../fisica/faraday.js";
import { COLUMNAS as COLUMNAS_2 } from "../fisica/ampere.js";

const V_CC = 5;      // referencia del ADC del Arduino Uno [V]
const BITS = 10;
const CODIGO_MAX = 2 ** BITS - 1;
const MAX_ERRORES = 5;

/* ---------- Tabla genérica ---------- */

// "Voltaje_Hall [V]" -> { nombre: "voltaje_hall", unidad: "v" }
export function normalizarEncabezado(texto) {
  const limpio = texto.replace(/^﻿/, "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const unidad = /[[(]\s*([^\])]*)\s*[\])]/.exec(limpio)?.[1]?.trim() ?? null;
  const nombre = limpio.replace(/[[(].*?[\])]/g, "").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return { nombre, unidad };
}

const esControl = (linea) => /^(start|stop)$/i.test(linea.trim());

function separadorDe(linea) {
  if (linea.includes("\t")) return "\t";
  if (linea.includes(";")) return ";";
  return ",";
}

function aNumero(celda, separador) {
  const texto = celda.trim();
  if (texto === "") return NaN;
  return Number(separador === "," ? texto : texto.replace(",", "."));
}

/*
 * Tabla numérica con encabezado. Devuelve { ok, encabezados, filas, lineas } (lineas: número de
 * línea del archivo de cada fila) o { ok: false, errores }.
 */
export function leerTabla(texto) {
  const lineas = String(texto).replace(/^﻿/, "").split(/\r?\n/);
  const utiles = lineas.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => l.trim() !== "" && !esControl(l));
  if (utiles.length === 0) return { ok: false, errores: ["El archivo está vacío."] };

  // El encabezado es la primera línea de dos o más celdas con alguna que no es número
  const iEncabezado = utiles.findIndex(({ l }) => {
    const celdas = l.split(separadorDe(l));
    return celdas.length >= 2 && celdas.some((c) => !Number.isFinite(aNumero(c, separadorDe(l))));
  });
  if (iEncabezado < 0) return { ok: false, errores: ["Falta el encabezado (por ejemplo Tiempo,Voltaje)."] };
  const separador = separadorDe(utiles[iEncabezado].l);
  const encabezados = utiles[iEncabezado].l.split(separador).map(normalizarEncabezado);
  const crudas = encabezados.map((e, i) => utiles[iEncabezado].l.split(separador)[i].trim());

  const filas = [];
  const numeros = [];
  const errores = [];
  for (const { l, n } of utiles.slice(iEncabezado + 1)) {
    const celdas = l.split(separador);
    const fila = encabezados.map((_, j) => aNumero(celdas[j] ?? "", separador));
    const mala = fila.findIndex((v) => !Number.isFinite(v));
    if (mala >= 0) {
      errores.push(`Fila ${n}, columna "${crudas[mala]}": valor no numérico ("${(celdas[mala] ?? "").trim()}").`);
      if (errores.length >= MAX_ERRORES) break;
      continue;
    }
    filas.push(fila);
    numeros.push(n);
  }
  if (errores.length > 0) return { ok: false, errores };
  if (filas.length < 2) return { ok: false, errores: ["El archivo tiene menos de dos filas de datos."] };
  return { ok: true, encabezados, crudas, filas, lineas: numeros };
}

// Índice de la columna cuyo nombre empieza por alguno de los prefijos. Los de una letra deben
// ir solos o seguidos de "_": "v_hall" es voltaje, pero "tension" no es tiempo.
const coincide = (nombre, p) => (p.length === 1 ? nombre === p || nombre.startsWith(`${p}_`) : nombre.startsWith(p));
function buscarColumna(encabezados, prefijos) {
  return encabezados.findIndex((e) => prefijos.some((p) => coincide(e.nombre, p)));
}

const columna = (tabla, j) => Float64Array.from(tabla.filas, (f) => f[j]);
const sonCodigos = (valores) => valores.every((v) => Number.isInteger(v) && v >= 0 && v <= CODIGO_MAX) && valores.some((v) => v > V_CC);

// Busca dos columnas por nombre; si no las encuentra y hay exactamente dos, usa esas
function dosColumnas(tabla, prefijosA, prefijosB, nombres) {
  let a = buscarColumna(tabla.encabezados, prefijosA);
  let b = buscarColumna(tabla.encabezados, prefijosB);
  const avisos = [];
  if ((a < 0 || b < 0) && tabla.encabezados.length === 2) {
    [a, b] = [0, 1];
    avisos.push(`No se reconocieron los nombres del encabezado; se usó la primera columna como ${nombres[0]} y la segunda como ${nombres[1]}.`);
  }
  if (a < 0 || b < 0) {
    const faltan = [a < 0 ? nombres[0] : null, b < 0 ? nombres[1] : null].filter(Boolean).join(" y ");
    return { errores: [`Falta la columna de ${faltan}. Encabezado leído: ${tabla.crudas.join(", ")}.`] };
  }
  return { a, b, avisos };
}

/* ---------- Hito 1: Tiempo,Voltaje ---------- */

const FACTOR_TIEMPO = { ms: 1e-3, s: 1, us: 1e-6, "µs": 1e-6, micros: 1e-6, millis: 1e-3 };

/*
 * Medición del Hito 1. Tiempo en ms (millis) salvo que el encabezado diga otra unidad o el paso
 * típico supere 50 (entonces son µs, de micros()). Voltaje en V o código ADC (todos enteros de 0
 * a 1023). Devuelve { ok, t [s] desde la primera muestra, V [V], codigos, esCodigo,
 * unidadTiempo, filas, avisos }.
 */
export function leerMedicionHito1(texto) {
  const tabla = leerTabla(texto);
  if (!tabla.ok) return tabla;
  const cols = dosColumnas(tabla, ["tiempo", "t", "time", "millis", "micros"], ["voltaje", "v", "volt", "tension", "a0", "codigo", "lectura", "valor", "adc"], ["tiempo", "voltaje"]);
  if (cols.errores) return { ok: false, errores: cols.errores };
  const avisos = [...cols.avisos];

  const crudo = columna(tabla, cols.a);
  for (let i = 1; i < crudo.length; i++) {
    if (!(crudo[i] > crudo[i - 1])) {
      return { ok: false, errores: [`El tiempo debe ser creciente: fila ${tabla.lineas[i]} (${crudo[i]} después de ${crudo[i - 1]}).`] };
    }
  }
  const encabezadoT = tabla.encabezados[cols.a];
  let unidadTiempo = FACTOR_TIEMPO[encabezadoT.unidad] ? encabezadoT.unidad : FACTOR_TIEMPO[encabezadoT.nombre] ? encabezadoT.nombre : null;
  if (!unidadTiempo) {
    const pasos = Array.from(crudo.subarray(1), (v, i) => v - crudo[i]).sort((x, y) => x - y);
    unidadTiempo = pasos[Math.floor(pasos.length / 2)] > 50 ? "us" : "ms";
    if (unidadTiempo === "us") avisos.push("El paso entre muestras es mayor que 50: se leyó el tiempo en µs (micros()).");
  }
  const factor = FACTOR_TIEMPO[unidadTiempo];
  const t = Float64Array.from(crudo, (v) => (v - crudo[0]) * factor);

  const valores = columna(tabla, cols.b);
  const esCodigo = sonCodigos(valores);
  const V = esCodigo ? Float64Array.from(valores, (c) => aVoltaje(c, V_CC, BITS)) : valores;
  const codigos = esCodigo ? valores : Float64Array.from(valores, (v) => (v * 2 ** BITS) / V_CC);
  return { ok: true, hito: 1, t, V, codigos, esCodigo, unidadTiempo, filas: t.length, avisos };
}

/* ---------- Hito 2: CicloTrabajo_PWM,Voltaje_Hall ---------- */

/*
 * Medición del Hito 2. El ciclo va de 0 a 255 (analogWrite) si algún valor pasa de 100 o el
 * encabezado no dice "%"; si no, en %. El voltaje, en V o código. Si hay varias lecturas por
 * ciclo se promedian. Devuelve { ok, D [%] creciente, V [V], codigos, lecturas, esCodigo,
 * cicloEn255, filas, avisos }.
 */
export function leerMedicionHito2(texto) {
  const tabla = leerTabla(texto);
  if (!tabla.ok) return tabla;
  const cols = dosColumnas(tabla, ["ciclo", "d", "duty", "pwm", "dc"], ["voltaje", "v", "volt", "tension", "hall", "a1", "codigo", "lectura", "b"], ["ciclo de trabajo", "voltaje del Hall"]);
  if (cols.errores) return { ok: false, errores: cols.errores };
  const avisos = [...cols.avisos];

  const ciclo = columna(tabla, cols.a);
  const unidad = tabla.encabezados[cols.a].unidad ?? "";
  const enPorcentaje = unidad === "%";
  const cicloEn255 = !enPorcentaje && (unidad.includes("255") || ciclo.some((v) => v > 100));
  const fueraDeRango = ciclo.findIndex((v) => v < 0 || v > (cicloEn255 ? 255 : 100));
  if (fueraDeRango >= 0) {
    return { ok: false, errores: [`Fila ${tabla.lineas[fueraDeRango]}: ciclo de trabajo fuera de rango (${ciclo[fueraDeRango]}).`] };
  }
  if (!cicloEn255 && !enPorcentaje && !unidad) avisos.push("Ningún ciclo pasa de 100: se leyó en %. Si era analogWrite (0 a 255), escribe la unidad en el encabezado, por ejemplo CicloTrabajo_PWM [0-255].");

  const valores = columna(tabla, cols.b);
  const esCodigo = sonCodigos(valores);
  const voltios = esCodigo ? Float64Array.from(valores, (c) => aVoltaje(c, V_CC, BITS)) : valores;

  // Promedio por ciclo de trabajo
  const grupos = new Map();
  ciclo.forEach((c, i) => {
    const D = Math.round((cicloEn255 ? (c * 100) / 255 : c) * 100) / 100;
    const g = grupos.get(D) ?? { suma: 0, n: 0 };
    g.suma += voltios[i];
    g.n += 1;
    grupos.set(D, g);
  });
  const ordenados = [...grupos.entries()].sort((a, b) => a[0] - b[0]);
  if (ordenados.length < 2) return { ok: false, errores: ["Se necesitan al menos dos ciclos de trabajo distintos."] };
  const D = Float64Array.from(ordenados, ([d]) => d);
  const V = Float64Array.from(ordenados, ([, g]) => g.suma / g.n);
  const lecturas = Int32Array.from(ordenados, ([, g]) => g.n);
  const codigos = Float64Array.from(V, (v) => (v * 2 ** BITS) / V_CC);
  return { ok: true, hito: 2, D, V, codigos, lecturas, esCodigo, cicloEn255, filas: ciclo.length, avisos };
}

export const leerMedicion = (hito, texto) => (hito === 1 ? leerMedicionHito1(texto) : leerMedicionHito2(texto));

/* ---------- Escritura del CSV del gemelo ---------- */

// Encabezados de exportación; B_s se escribe en mT (escala 1e3)
const EXPORTACION = {
  1: { columnas: COLUMNAS_1, encabezado: "t [s],x [m],v [m/s],Phi [Wb],emf [V],V_A0 [V],codigo [-],codigo_filtrado [-]", escalas: {} },
  2: { columnas: COLUMNAS_2, encabezado: "t [s],D [%],I_prom [A],M [A/m],B_s [mT],V_hall [V],codigo [-]", escalas: { B_s: 1e3 } },
};

// 10 cifras significativas, sin ceros sobrantes
export const numeroCSV = (v) => String(Number(v.toPrecision(10)));

export function escribirCSV(hito, sim) {
  const { columnas, encabezado, escalas } = EXPORTACION[hito];
  const filas = [encabezado];
  for (let k = 0; k < sim.Nt; k++) {
    filas.push(columnas.map((c) => numeroCSV(sim.r[c][k] * (escalas[c] ?? 1))).join(","));
  }
  return filas.join("\n");
}
