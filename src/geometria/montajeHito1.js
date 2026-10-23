/*
 * Montaje del Hito 1 (boceto 1) [cm]: tubo vertical de acrílico sujeto a un soporte universal, la
 * bobina devanada sobre el tubo, el imán que cae por dentro, un tope de espuma y una bornera
 * atornillada a la base del soporte, a la que llegan los alambres de la bobina y de la que salen
 * los cables DuPont hacia la protoboard y A0. Funciones puras (sin three.js).
 *
 * El radio exterior del tubo es el r_int de la bobina (parámetro); la pared mide 0.6 mm.
 */

import { ALTO_TAPETE, CENTRO_BOBINA_1 } from "./mesa.js";
import { aEscena } from "./unidades.js";
import { extremosBobina } from "./helice.js";

const [X_EJE, Y_BOBINA, Z_EJE] = CENTRO_BOBINA_1;

export const TUBO = { yBase: ALTO_TAPETE + 1, yTope: ALTO_TAPETE + 36, pared: 0.06 };

// Tope de espuma dentro del tubo, sobre la base del soporte
export const TOPE = { yBase: TUBO.yBase, alto: 1 };

export const SOPORTE = {
  base: { centro: [X_EJE, ALTO_TAPETE + 0.5, -7.6], tamano: [7, 1, 4.6] },
  varilla: { x: X_EJE, z: -9.3, radio: 0.5, yTope: ALTO_TAPETE + 36.2 },
};

// Alturas de las dos pinzas que sujetan el tubo: a 2 cm de los extremos de la bobina
export function alturasPinzas(bobina) {
  const mitad = aEscena(bobina.L_bob) / 2 + 2;
  return [Math.max(TOPE.yBase + TOPE.alto + 1.5, Y_BOBINA - mitad), Math.min(TUBO.yTope - 1.5, Y_BOBINA + mitad)];
}

// Bornera de 2 polos sobre la base del soporte, a la izquierda del tubo (hacia la protoboard)
export const BORNERA = {
  centro: [X_EJE - 2.7, SOPORTE.base.centro[1] + 0.5 + 0.45, -6.4],
  tamano: [1, 0.9, 1.0],
  // Entradas de los dos polos: por la cara -x llegan los cables DuPont y por la +x los alambres
  polos: [-0.25, 0.25],
};

export const EJE_TUBO = { x: X_EJE, z: Z_EJE };

// Entrada de cada polo de la bornera por la cara indicada (-1: cables, +1: alambres)
export function entradaBornera(polo, cara) {
  const [x, y, z] = BORNERA.centro;
  return [x + cara * (BORNERA.tamano[0] / 2), y, z + BORNERA.polos[polo]];
}

// Terminales externos del netlist: los cables DuPont entran por la cara izquierda de la bornera
export const EXTERNOS_HITO_1 = {
  bobina1: entradaBornera(0, -1),
  bobina2: entradaBornera(1, -1),
};

// Altura de escena del centro del imán para su posición x [m] (x > 0 hacia abajo)
export function alturaImanEnTubo(x, L_im) {
  const y = Y_BOBINA - aEscena(x);
  // Al terminar de caer queda apoyado sobre el tope (el motor sigue integrando lejos de la bobina)
  return Math.max(y, TOPE.yBase + TOPE.alto + aEscena(L_im) / 2);
}

/*
 * Alambres esmaltados de los extremos de la bobina a la bornera: salen radiales hacia -x, bajan
 * pegados al tubo por fuera de la bobina y entran por la cara derecha de la bornera.
 * `bobina` es la geometría del motor (geometriaBobina, en metros).
 */
export function alambresBobina(bobina) {
  const separacion = aEscena(bobina.r_ext) + 0.25;
  const yEntrada = BORNERA.centro[1];
  return extremosBobina(bobina).map((extremo, polo) => {
    const inicio = [X_EJE + extremo[0], Y_BOBINA + extremo[1], Z_EJE + extremo[2]];
    const zPolo = BORNERA.centro[2] + BORNERA.polos[polo];
    const fuera = [X_EJE - separacion, inicio[1], zPolo];
    const abajo = [X_EJE - separacion, yEntrada, zPolo];
    return [inicio, fuera, abajo, entradaBornera(polo, 1)];
  });
}
