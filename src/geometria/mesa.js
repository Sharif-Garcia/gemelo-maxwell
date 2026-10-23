/*
 * Mesa de trabajo y zonas de cada montaje [cm]. Funciones puras (sin three.js).
 *
 * El tapete antiestático está centrado en el origen y su cara superior es y = ALTO_TAPETE;
 * todo se apoya sobre ella. Las zonas siguen los bocetos de la guía (docs/bocetos):
 * - Hito 1: Arduino a la izquierda, protoboard a la derecha y la bobina en un soporte detrás.
 * - Hito 2: el solenoide donde el boceto tiene el motor (izquierda), el TIP120 y el diodo en
 *   la protoboard, el Arduino a la derecha y la fuente de 12 V detrás.
 * Las vistas de la cámara encuadran estas zonas; los montajes (fases 5 a 7) colocan sus
 * objetos dentro de ellas.
 */

export const TAPETE = { ancho: 62, fondo: 34, radio: 1.5 };   // x, z
export const ALTO_TAPETE = 0.3;

const caja = (min, max) => ({ min, max });
const y0 = ALTO_TAPETE;

export const ZONAS = {
  1: {
    arduino: caja([-21.5, y0, -3.2], [-13, y0 + 1.8, 3.2]),
    protoboard: caja([-4.5, y0, -3], [13, y0 + 1.5, 3]),
    bobina: caja([17, y0, -10], [25, y0 + 36.5, -2]),
  },
  2: {
    solenoide: caja([-31, y0, -2.6], [-17, y0 + 5, 2.6]),
    protoboard: caja([-13.5, y0, -3], [4, y0 + 4, 3]),
    transistor: caja([-9, y0, -2], [-2, y0 + 4, 2]),
    arduino: caja([8, y0, -3.2], [16.2, y0 + 1.8, 3.2]),
    fuente: caja([-29, y0, 5], [-17, y0 + 3.5, 11]),
  },
};

// Caja del tapete completo (la encuadran las vistas generales)
export const CAJA_TAPETE = {
  min: [-TAPETE.ancho / 2, 0, -TAPETE.fondo / 2],
  max: [TAPETE.ancho / 2, ALTO_TAPETE, TAPETE.fondo / 2],
};

// Centro de la bobina del Hito 1 y eje vertical: el imán cae hacia -y (montajeHito1.js)
export const CENTRO_BOBINA_1 = [21, y0 + 20, -6];

// Caja que contiene varias zonas
export function unionCajas(cajas) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const c of cajas) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], c.min[i]);
      max[i] = Math.max(max[i], c.max[i]);
    }
  }
  return { min, max };
}
