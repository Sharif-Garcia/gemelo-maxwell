/*
 * Protoboard de 830 puntos (165.1 × 54.6 mm) [cm]. Funciones puras (sin three.js).
 *
 * Marco local: origen en el centro de la cara superior, x a lo largo de las columnas (1 a 63,
 * paso 2.54 mm) y z hacia el frente: la fila a queda cerca (+z) y la j lejos (-z), como en el
 * boceto. Las filas a-e de cada columna están unidas, igual que las f-j; el canal central las
 * separa. Rieles (50 agujeros en grupos de 5) como en el boceto del Hito 1: arriba "-" afuera y
 * "+" adentro; abajo "-" adentro y "+" afuera. Cada riel conduce en todo su largo.
 *
 * Identificadores: "c10" (fila c, columna 10) o "sup+12" / "inf-3" (riel, agujero 0 a 49).
 */

export const PASO = 0.254;
export const PB = { ancho: 16.51, fondo: 5.46, alto: 0.95 };
export const COLUMNAS = 63;
export const FILAS = "abcdefghij";
export const AGUJEROS_RIEL = 50;

// z local de cada fila: a-e de 1.397 a 0.381 y f-j de -0.381 a -1.397 (canal de 7.62 mm)
const zFila = (fila) => {
  const i = FILAS.indexOf(fila);
  return i < 5 ? (4 - i) * PASO + 1.5 * PASO : -((i - 5) * PASO + 1.5 * PASO);
};

// z de los rieles: el interior a 3 pasos de la última fila y el exterior un paso más afuera
const Z_RIEL = {
  "sup-": -(zFila("a") + 4 * PASO),
  "sup+": -(zFila("a") + 3 * PASO),
  "inf-": zFila("a") + 3 * PASO,
  "inf+": zFila("a") + 4 * PASO,
};

const xColumna = (columna) => (columna - 32) * PASO;
const xRiel = (k) => (k + Math.floor(k / 5) - 29) * PASO;

const PATRON = /^(?:([a-j])(\d{1,2})|(sup|inf)([+-])(\d{1,2}))$/;

function analizar(id) {
  const m = PATRON.exec(id);
  if (!m) return null;
  if (m[1]) {
    const columna = Number(m[2]);
    return columna >= 1 && columna <= COLUMNAS ? { tipo: "terminal", fila: m[1], columna } : null;
  }
  const k = Number(m[5]);
  return k < AGUJEROS_RIEL ? { tipo: "riel", riel: `${m[3]}${m[4]}`, k } : null;
}

export const existeAgujero = (id) => analizar(id) !== null;

function analizarOError(id) {
  const a = analizar(id);
  if (!a) throw new Error(`Agujero inexistente en la protoboard: ${id}`);
  return a;
}

// Centro local [x, 0, z] del agujero en la cara superior
export function agujeroLocal(id) {
  const a = analizarOError(id);
  return a.tipo === "terminal" ? [xColumna(a.columna), 0, zFila(a.fila)] : [xRiel(a.k), 0, Z_RIEL[a.riel]];
}

// Tira conductora a la que pertenece el agujero
export function tira(id) {
  const a = analizarOError(id);
  if (a.tipo === "riel") return `riel${a.riel}`;
  return `col${a.columna}${FILAS.indexOf(a.fila) < 5 ? "abajo" : "arriba"}`;
}

// Agujero del riel más cercano a una columna (para conexiones cortas)
export function rielCercano(riel, columna) {
  let mejor = 0;
  for (let k = 1; k < AGUJEROS_RIEL; k++) {
    if (Math.abs(xRiel(k) - xColumna(columna)) < Math.abs(xRiel(mejor) - xColumna(columna))) mejor = k;
  }
  return `${riel}${mejor}`;
}

// Todos los agujeros (830): para dibujarlos
export function todosLosAgujeros() {
  const ids = [];
  for (const fila of FILAS) for (let c = 1; c <= COLUMNAS; c++) ids.push(`${fila}${c}`);
  for (const riel of Object.keys(Z_RIEL)) for (let k = 0; k < AGUJEROS_RIEL; k++) ids.push(`${riel}${k}`);
  return ids;
}

export const zRiel = (riel) => Z_RIEL[riel];
export { xColumna, zFila };
