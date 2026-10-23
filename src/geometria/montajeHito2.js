/*
 * Montaje del Hito 2 (boceto 2 con el solenoide en lugar del motor) [cm]. Funciones puras.
 *
 * El perno (núcleo) está acostado sobre el eje x, con la punta hacia +x mirando al SS49E. El
 * sensor queda fijo (sus cables están en el netlist) y el perno se coloca a `d_sensor` de él: al
 * cambiar la distancia se mueve el perno con su solenoide. El solenoide se devana sobre el perno y
 * sus dos alambres van a una bornera, de la que salen los cables a la protoboard. La fuente de 12 V
 * es un adaptador con cable a un conector hembra de barril con bornera.
 *
 * Correspondencia con el motor (ampere.js): el eje +z del motor es +x de la escena, con origen en
 * el centro del núcleo; la bobina está desplazada `z_bob` respecto a él.
 */

import { ALTO_TAPETE } from "./mesa.js";
import { aEscena } from "./unidades.js";
import { extremosBobina } from "./helice.js";

const y0 = ALTO_TAPETE;

// Eje del perno
export const EJE_PERNO = { y: y0 + 2.6, z: 0 };

// SS49E: cara plana hacia -x en X_SENSOR; cuerpo de 4.1 × 3.0 × 1.52 mm
export const SENSOR = {
  xCara: -18.6,
  tamano: [0.152, 0.3, 0.41],   // x (espesor), y, z
  pasoPatas: 0.127,
  pasoConectores: 0.254,
  // Las patas bajan 0.6 cm abriéndose a 2.54 mm y entran en conectores DuPont hembra de pie
  tramoAbierto: 0.6,
  altoConector: 1.4,
};
const Y_CONECTOR_SUPERIOR = EJE_PERNO.y - SENSOR.tamano[1] / 2 - SENSOR.tramoAbierto;
export const Y_CONECTOR_INFERIOR = Y_CONECTOR_SUPERIOR - SENSOR.altoConector;
const X_PATAS = SENSOR.xCara + SENSOR.tamano[0] / 2;

// Cabeza hexagonal proporcional al diámetro, como la del perno de 5/16" (1/2" entre caras y
// 7/32" de alto): radio = d_nuc/2 [cm]
export function cabezaPerno(radio) {
  return { entreCaras: 3.2 * radio, alto: 1.39 * radio };
}
export const PASO_ROSCA = 0.141;   // 18 hilos por pulgada

// Bornera del solenoide, delante del perno: alambres por -x y cables hacia la protoboard por +x
export const BORNERA_SOLENOIDE = { centro: [-21.2, y0 + 0.45, 1.9], tamano: [1, 0.9, 1], polos: [-0.25, 0.25] };

// Fuente: adaptador de 12 V, cable de salida y conector hembra de barril con bornera
export const FUENTE = {
  adaptador: { centro: [-26, y0 + 1.5, 8.5], tamano: [5.5, 3, 4] },
  barril: { centro: [-21.2, y0 + 0.6, 7.6], radio: 0.55, largo: 1.6 },
  bornera: { centro: [-19.6, y0 + 0.45, 7.6], tamano: [1, 0.9, 1], polos: [-0.25, 0.25] },
};

// Entrada de un polo de una bornera (polos a lo largo de z) por la cara -1 (-x) o +1 (+x)
export function entradaBornera(bornera, polo, cara) {
  const [x, y, z] = bornera.centro;
  return [x + cara * (bornera.tamano[0] / 2), y, z + bornera.polos[polo]];
}

// Terminales externos del netlist y dirección en que salen sus cables (hacia la protoboard)
export const EXTERNOS_HITO_2 = {
  solenoide1: entradaBornera(BORNERA_SOLENOIDE, 0, 1),
  solenoide2: entradaBornera(BORNERA_SOLENOIDE, 1, 1),
  hall1: [X_PATAS, Y_CONECTOR_INFERIOR, -SENSOR.pasoConectores],
  hall2: [X_PATAS, Y_CONECTOR_INFERIOR, 0],
  hall3: [X_PATAS, Y_CONECTOR_INFERIOR, SENSOR.pasoConectores],
  "fuente+": entradaBornera(FUENTE.bornera, 0, 1),
  "fuente-": entradaBornera(FUENTE.bornera, 1, 1),
};
export const SALIDAS_HITO_2 = Object.fromEntries(Object.keys(EXTERNOS_HITO_2).map((n) => [n, [1, 0, 0]]));

// Patas del SS49E: del cuerpo bajan, se abren a 2.54 mm y entran al conector (marco de escena)
export function patasSensor() {
  const yCuerpo = EJE_PERNO.y - SENSOR.tamano[1] / 2;
  return [-1, 0, 1].map((i) => [
    [X_PATAS, yCuerpo + 0.05, i * SENSOR.pasoPatas],
    [X_PATAS, yCuerpo - 0.15, i * SENSOR.pasoPatas],
    [X_PATAS, Y_CONECTOR_SUPERIOR + 0.1, i * SENSOR.pasoConectores],
    [X_PATAS, Y_CONECTOR_SUPERIOR - 0.4, i * SENSOR.pasoConectores],
  ]);
}

/*
 * Posición del perno para los parámetros del motor (en metros): extremos de la caña, centro del
 * núcleo, centro de la bobina y radio, todo en cm de escena.
 */
export function colocacionPerno(p) {
  const largo = aEscena(p.L_nuc);
  const xPunta = SENSOR.xCara - aEscena(p.d_sensor);
  const xCola = xPunta - largo;
  const xCentro = (xPunta + xCola) / 2;
  return { xPunta, xCola, xCentro, largo, radio: aEscena(p.d_nuc) / 2, xBobina: xCentro + aEscena(p.z_bob) };
}

// Bloques en V de madera que sostienen el perno (ancho en x, fondo en z)
export const BLOQUE_V = { ancho: 1.4, fondo: 1.6 };

/*
 * Los dos bloques: cerca de cada extremo del perno, fuera de la bobina si queda perno libre de ese
 * lado. Cada bloque llega hasta el perno, o hasta la parte de abajo de la bobina si queda bajo ella
 * (la bobina corrida hacia una punta descansa sobre el bloque). Devuelve [{ x, yTope }].
 */
export function soportesPerno(perno, bobina) {
  const mitad = aEscena(bobina.L_bob) / 2;
  const inicioBobina = perno.xBobina - mitad;
  const finBobina = perno.xBobina + mitad;
  const izquierda = Math.max(perno.xCola + 0.6, Math.min(perno.xCola + 1, inicioBobina - 0.9));
  const derecha = Math.min(perno.xPunta - 0.6, Math.max(perno.xPunta - 1, finBobina + 0.9));
  return [izquierda, derecha].map((x) => {
    const bajoBobina = x + BLOQUE_V.ancho / 2 > inicioBobina && x - BLOQUE_V.ancho / 2 < finBobina;
    return { x, yTope: EJE_PERNO.y - (bajoBobina ? aEscena(bobina.r_ext) : perno.radio) };
  });
}

/*
 * Alambres esmaltados del solenoide a su bornera: salen de los extremos del devanado hacia +z,
 * bajan por fuera de la bobina y entran por la cara -x de la bornera. El devanado empieza y
 * termina en el ángulo π/2, que en la escena apunta a +z (hacia la bornera).
 */
export const ANGULO_SALIDA = Math.PI / 2;

export function alambresSolenoide(bobina, perno) {
  // Por fuera de la bobina y de los bloques en V (bajan delante de ellos)
  const separacion = Math.max(aEscena(bobina.r_ext) + 0.25, BLOQUE_V.fondo / 2 + 0.2);
  return extremosBobina(bobina, ANGULO_SALIDA).map((extremo, polo) => {
    // Marco de la bobina: eje +y; en la escena el eje es +x (giro de -90° alrededor de z)
    const inicio = [perno.xBobina + extremo[1], EJE_PERNO.y - extremo[0], EJE_PERNO.z + extremo[2]];
    const destino = entradaBornera(BORNERA_SOLENOIDE, polo, -1);
    const fuera = [inicio[0], inicio[1], EJE_PERNO.z + separacion];
    const abajo = [inicio[0], destino[1], EJE_PERNO.z + separacion];
    const antes = [destino[0] - 0.6, destino[1], destino[2]];
    return [inicio, fuera, abajo, antes, destino];
  });
}
