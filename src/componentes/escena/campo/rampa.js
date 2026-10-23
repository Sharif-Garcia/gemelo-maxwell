/*
 * Escala de color de |B| (sin three.js). Magnitud continua → escala secuencial de un solo tono, de
 * claro (cerca de cero, se funde con el fondo) a oscuro (campo intenso): la rampa azul validada de
 * la guía de visualización (pasos 100 a 700), en escala logarítmica de 3 décadas. Nunca arcoíris.
 */

export const RAMPA_AZUL = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
  "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];

export const DECADAS = 3;

// Límites log10 de la escala: de Bmax/10^DECADAS a Bmax [T]
export function escalaLog(Bmax) {
  const maximo = Math.log10(Bmax);
  return [maximo - DECADAS, maximo];
}

// Posición en la escala (0 a 1) de un |B| [T]
export function posicionEscala(B, [minimo, maximo]) {
  if (!(B > 0)) return 0;
  return Math.min(1, Math.max(0, (Math.log10(B) - minimo) / (maximo - minimo)));
}

const aRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Color interpolado de la rampa para t en [0, 1], como [r, g, b] de 0 a 255
export function colorRampa(t) {
  const x = Math.min(1, Math.max(0, t)) * (RAMPA_AZUL.length - 1);
  const i = Math.min(RAMPA_AZUL.length - 2, Math.floor(x));
  const f = x - i;
  const a = aRGB(RAMPA_AZUL[i]);
  const b = aRGB(RAMPA_AZUL[i + 1]);
  return a.map((v, k) => Math.round(v + f * (b[k] - v)));
}

// Marcas de la barra de colores: valores en mT por década
export function marcasEscala([minimo, maximo]) {
  const marcas = [];
  for (let e = Math.ceil(minimo); e <= Math.floor(maximo); e++) {
    marcas.push({ t: (e - minimo) / (maximo - minimo), mT: 10 ** e * 1e3 });
  }
  return marcas;
}
