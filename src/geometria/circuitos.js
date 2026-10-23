/*
 * Netlist de cada hito y su verificación. Funciones puras (sin three.js).
 *
 * Ubicaciones: "arduino:<pin>" (agujero del header), "pb:<agujero>" (protoboard) y
 * "ext:<nombre>" (terminal fuera de la protoboard: bobina, solenoide, sensor, fuente; su posición
 * la da el montaje). Cada componente pone sus terminales en ubicaciones y cada cable une dos
 * ubicaciones. `redes` es el circuito esperado de la guía: qué terminales deben quedar unidos.
 */

import { existePin, PUENTES_INTERNOS } from "./arduino.js";
import { existeAgujero, tira, rielCercano } from "./protoboard.js";

export const COLORES_CABLE = {
  rojo: "#d6332f",
  negro: "#1e1e20",
  naranja: "#f08a24",
  verde: "#2f9e52",
  azul: "#2f6fd6",
  amarillo: "#f2c230",
};

/*
 * Hito 1 (boceto 1): divisor de dos 10 kΩ entre +5 V y GND que da la referencia de 2.5 V; la
 * bobina va entre esa referencia y A0. 5 V y GND del Arduino (lado cercano) a los rieles de
 * abajo; R1 de c6 a c10, R2 de d10 a d14 (la columna 10 es la referencia).
 */
const HITO_1 = {
  componentes: [
    { id: "R1", tipo: "resistencia", valor: 10000, terminales: { 1: "pb:c6", 2: "pb:c10" } },
    { id: "R2", tipo: "resistencia", valor: 10000, terminales: { 1: "pb:d10", 2: "pb:d14" } },
    { id: "bobina", tipo: "bobina", terminales: { 1: "ext:bobina1", 2: "ext:bobina2" } },
  ],
  cables: [
    { id: "5V", color: "rojo", desde: "arduino:5V", hasta: `pb:${rielCercano("inf+", 1)}` },
    { id: "GND", color: "negro", desde: "arduino:GND1", hasta: `pb:${rielCercano("inf-", 2)}` },
    { id: "puente5V", color: "rojo", desde: `pb:${rielCercano("inf+", 6)}`, hasta: "pb:a6" },
    { id: "puenteGND", color: "negro", desde: `pb:${rielCercano("inf-", 14)}`, hasta: "pb:a14" },
    { id: "bobinaRef", color: "naranja", desde: "pb:b10", hasta: "ext:bobina1" },
    { id: "bobinaA0", color: "naranja", desde: "ext:bobina2", hasta: "arduino:A0" },
  ],
  redes: {
    "5V": ["arduino:5V", "R1:1"],
    GND: ["arduino:GND1", "R2:2"],
    VREF: ["R1:2", "R2:1", "bobina:1"],
    A0: ["arduino:A0", "bobina:2"],
  },
};

/*
 * Hito 2 (boceto 2 con el solenoide en lugar del motor): +12 V → solenoide → colector del
 * TIP120, emisor a GND, D9 → R_base → base, 1N4007 en antiparalelo con el solenoide (cátodo a
 * +12 V), tierras comunes; SS49E con 5 V, GND y salida a A1. El Arduino está girado (USB a la
 * derecha): sus pines de potencia quedan del lado lejano, así que los rieles de arriba llevan
 * 5 V y GND del Arduino y los de abajo +12 V y GND de la fuente.
 */
const HITO_2 = {
  componentes: [
    { id: "Rb", tipo: "resistencia", valor: 1000, parametro: "R_base", terminales: { 1: "pb:c14", 2: "pb:c20" } },
    { id: "Q1", tipo: "tip120", terminales: { B: "pb:e20", C: "pb:e21", E: "pb:e22" } },
    { id: "D1", tipo: "diodo", terminales: { anodo: "pb:b21", catodo: `pb:${rielCercano("inf+", 21)}` } },
    { id: "solenoide", tipo: "solenoide", terminales: { 1: "ext:solenoide1", 2: "ext:solenoide2" } },
    { id: "hall", tipo: "ss49e", terminales: { 1: "ext:hall1", 2: "ext:hall2", 3: "ext:hall3" } },
    { id: "fuente", tipo: "fuente", terminales: { "+": "ext:fuente+", "-": "ext:fuente-" } },
  ],
  cables: [
    { id: "D9", color: "verde", desde: "arduino:D9", hasta: "pb:a14" },
    { id: "emisor", color: "negro", desde: "pb:a22", hasta: `pb:${rielCercano("inf-", 23)}` },
    { id: "solenoide12V", color: "naranja", desde: "ext:solenoide1", hasta: `pb:${rielCercano("inf+", 27)}` },
    { id: "solenoideColector", color: "naranja", desde: "ext:solenoide2", hasta: "pb:d21" },
    { id: "fuente+", color: "rojo", desde: "ext:fuente+", hasta: `pb:${rielCercano("inf+", 2)}` },
    { id: "fuente-", color: "negro", desde: "ext:fuente-", hasta: `pb:${rielCercano("inf-", 3)}` },
    { id: "tierraComun", color: "negro", desde: `pb:${rielCercano("inf-", 61)}`, hasta: `pb:${rielCercano("sup-", 61)}` },
    { id: "5V", color: "rojo", desde: "arduino:5V", hasta: `pb:${rielCercano("sup+", 59)}` },
    { id: "GND", color: "negro", desde: "arduino:GND1", hasta: `pb:${rielCercano("sup-", 58)}` },
    { id: "hallVcc", color: "rojo", desde: "ext:hall1", hasta: `pb:${rielCercano("sup+", 2)}` },
    { id: "hallGnd", color: "negro", desde: "ext:hall2", hasta: `pb:${rielCercano("sup-", 3)}` },
    { id: "hallSalida", color: "azul", desde: "ext:hall3", hasta: "arduino:A1" },
  ],
  redes: {
    "+12V": ["fuente:+", "solenoide:1", "D1:catodo"],
    COLECTOR: ["Q1:C", "D1:anodo", "solenoide:2"],
    BASE: ["Q1:B", "Rb:2"],
    D9: ["arduino:D9", "Rb:1"],
    GND: ["fuente:-", "Q1:E", "arduino:GND1", "hall:2"],
    "5V": ["arduino:5V", "hall:1"],
    A1: ["arduino:A1", "hall:3"],
  },
};

export const CIRCUITOS = { 1: HITO_1, 2: HITO_2 };

/*
 * Lazo de potencia del Hito 2 para el modo análisis: cada cable con el sentido de la corriente
 * convencional (+1 de `desde` a `hasta`) y su rama. La rama "solenoide" lleva la corriente de la
 * bobina siempre (al apagarse el transistor sigue circulando por el diodo); la rama "fuente", solo
 * la del transistor. El lazo: +12 V → solenoide → colector → emisor → GND → fuente.
 */
export const CORRIENTES_HITO_2 = {
  "fuente+": { rama: "fuente", sentido: 1 },
  solenoide12V: { rama: "solenoide", sentido: -1 },
  solenoideColector: { rama: "solenoide", sentido: 1 },
  emisor: { rama: "fuente", sentido: 1 },
  "fuente-": { rama: "fuente", sentido: -1 },
};

/* ---------- Verificación ---------- */

function ubicacionValida(id) {
  const [tipo, resto] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
  if (tipo === "arduino") return existePin(resto);
  if (tipo === "pb") return existeAgujero(resto);
  return tipo === "ext" && resto.length > 0;
}

function crearUnion() {
  const padre = new Map();
  const raiz = (x) => {
    if (!padre.has(x)) padre.set(x, x);
    let r = x;
    while (padre.get(r) !== r) r = padre.get(r);
    padre.set(x, r);
    return r;
  };
  return { raiz, unir: (a, b) => padre.set(raiz(a), raiz(b)) };
}

/*
 * Arma las conexiones (terminales en ubicaciones, cables, tiras de la protoboard y puentes
 * internos del Arduino) y las compara con las redes esperadas. Devuelve la lista de errores
 * (vacía si el montaje es fiel al circuito de la guía).
 */
export function verificarCircuito({ componentes, cables, redes }) {
  const errores = [];
  const { raiz, unir } = crearUnion();
  const usos = new Map();
  const usar = (ubicacion, quien) => {
    if (!ubicacionValida(ubicacion)) errores.push(`${quien}: ubicación inexistente ${ubicacion}`);
    usos.set(ubicacion, [...(usos.get(ubicacion) ?? []), quien]);
  };

  for (const c of componentes) {
    for (const [terminal, ubicacion] of Object.entries(c.terminales)) {
      usar(ubicacion, `${c.id}:${terminal}`);
      unir(`${c.id}:${terminal}`, ubicacion);
    }
  }
  for (const cable of cables) {
    usar(cable.desde, `cable ${cable.id}`);
    usar(cable.hasta, `cable ${cable.id}`);
    unir(cable.desde, cable.hasta);
  }
  for (const [ubicacion, quienes] of usos) {
    // Un agujero o un pin recibe una sola pata o un solo cable; un terminal externo es la pata de
    // su componente y recibe además un cable
    const cablesAqui = quienes.filter((q) => q.startsWith("cable ")).length;
    const patasAqui = quienes.length - cablesAqui;
    const repetido = ubicacion.startsWith("ext:") ? cablesAqui > 1 || patasAqui > 1 : quienes.length > 1;
    if (repetido) errores.push(`${ubicacion} tiene más de una pata o cable: ${quienes.join(", ")}`);
    if (ubicacion.startsWith("pb:") && existeAgujero(ubicacion.slice(3))) unir(ubicacion, `tira:${tira(ubicacion.slice(3))}`);
  }
  for (const grupo of PUENTES_INTERNOS) {
    for (let i = 1; i < grupo.length; i++) unir(`arduino:${grupo[0]}`, `arduino:${grupo[i]}`);
  }

  const raicesRed = new Map();
  for (const [red, miembros] of Object.entries(redes)) {
    const raices = new Set(miembros.map(raiz));
    if (raices.size > 1) errores.push(`La red ${red} está abierta: ${miembros.join(", ")} no quedan unidos`);
    for (const r of raices) {
      if (raicesRed.has(r) && raicesRed.get(r) !== red) errores.push(`Corto entre ${raicesRed.get(r)} y ${red}`);
      raicesRed.set(r, red);
    }
  }
  for (const cable of cables) {
    if (!raicesRed.has(raiz(cable.desde))) errores.push(`El cable ${cable.id} no pertenece a ninguna red`);
  }
  return errores;
}
