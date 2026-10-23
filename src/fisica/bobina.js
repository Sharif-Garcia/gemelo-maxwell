/*
 * Geometría de una bobina devanada en capas (ambos hitos). CLAUDE.md, "Geometría de una bobina".
 *
 * Las espiras llenan las capas en orden: cada capa tiene ceil(N/capas) espiras, salvo la última,
 * que recibe las restantes. En el marco de la bobina, el eje es z y el origen su centro.
 */

import { AWG, FACTOR_ESMALTE } from "./constantes.js";

export function geometriaBobina({ N, capas, AWG: calibre, r_int, R_medida = null }) {
  const alambre = AWG[calibre];
  if (!alambre) throw new Error(`Calibre AWG ${calibre} no está en la tabla`);
  if (!(N >= 1 && capas >= 1 && capas <= N)) throw new Error("Se necesita 1 <= capas <= N");

  const d_hilo = FACTOR_ESMALTE * alambre.d_cobre;
  const porCapa = Math.ceil(N / capas);
  const L_bob = porCapa * d_hilo;
  const r_ext = r_int + capas * d_hilo;
  const r_med = (r_int + r_ext) / 2;
  const R_calculada = N * 2 * Math.PI * r_med * alambre.rho;

  // Radio de cada capa y posición axial de cada espira (centro del hilo)
  const listaCapas = [];
  let restantes = N;
  for (let l = 0; l < capas && restantes > 0; l++) {
    const n = Math.min(porCapa, restantes);
    const z = new Float64Array(n);
    for (let j = 0; j < n; j++) z[j] = -L_bob / 2 + (j + 0.5) * d_hilo;
    listaCapas.push({ a: r_int + (l + 0.5) * d_hilo, z });
    restantes -= n;
  }

  return {
    d_hilo,
    L_bob,
    r_ext,
    r_med,
    R_bob: R_medida ?? R_calculada,
    R_calculada,
    longitudAlambre: N * 2 * Math.PI * r_med,
    capas: listaCapas,
  };
}
