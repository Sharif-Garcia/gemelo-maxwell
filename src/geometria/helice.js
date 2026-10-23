/*
 * Espiras de una bobina por capas como hélices [cm]. Funciones puras (sin three.js).
 *
 * Marco de la bobina: eje +y, origen en su centro. Cada capa es una hélice de radio a que pasa
 * por el centro de cada una de sus espiras (posiciones axiales de geometriaBobina); las capas
 * pares suben y las impares bajan, como al devanar a mano. Todas empiezan y terminan en el ángulo
 * `angulo0` (hacia la bornera), así los extremos de la bobina quedan de ese lado.
 */

import { aEscena } from "./unidades.js";

// Puntos de una capa: radio y posiciones axiales extremas en cm
export function puntosCapa({ radio, yInicio, yFin, vueltas, angulo0 = Math.PI, muestrasPorVuelta = 24 }) {
  // Con una sola espira la hélice es un anillo; con n espiras da n - 1 vueltas entre los extremos
  const giro = 2 * Math.PI * Math.max(1, vueltas - 1);
  const n = Math.max(muestrasPorVuelta, Math.round((giro / (2 * Math.PI)) * muestrasPorVuelta));
  const puntos = [];
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    const angulo = angulo0 + f * giro;
    puntos.push([radio * Math.cos(angulo), yInicio + f * (yFin - yInicio), radio * Math.sin(angulo)]);
  }
  return puntos;
}

/*
 * Capas de la bobina en cm a partir de la geometría del motor (bobina.js, en metros):
 * [{ radio, yInicio, yFin, vueltas }] en el marco de la bobina.
 */
export function capasEnEscena(bobina) {
  return bobina.capas.map((capa, l) => {
    const abajo = aEscena(capa.z[0]);
    const arriba = aEscena(capa.z[capa.z.length - 1]);
    const sube = l % 2 === 0;
    return { radio: aEscena(capa.a), yInicio: sube ? abajo : arriba, yFin: sube ? arriba : abajo, vueltas: capa.z.length };
  });
}

// Extremos del alambre: inicio de la primera capa y final de la última (marco de la bobina)
export function extremosBobina(bobina, angulo0 = Math.PI) {
  const capas = capasEnEscena(bobina);
  const primera = capas[0];
  const ultima = capas.at(-1);
  const punto = (radio, y) => [radio * Math.cos(angulo0), y, radio * Math.sin(angulo0)];
  return [punto(primera.radio, primera.yInicio), punto(ultima.radio, ultima.yFin)];
}
