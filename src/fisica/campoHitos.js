/*
 * Fuentes del campo de cada hito y opciones de trazado de sus líneas (SI). CLAUDE.md,
 * "Visualización del campo".
 *
 * Hito 1: el imán es una lámina (K = Br/mu0) magnetizada en +z del motor (sentido de la caída);
 * su campo no cambia con el tiempo, solo se traslada con el imán.
 * Hito 2: el campo es I·b_bob + M·b_nuc. Las líneas se trazan con la corriente y la
 * magnetización del paso de mayor corriente (la forma depende solo de M/I, casi constante en el
 * régimen lineal) y en cada instante se escalan por B_s(t)/B_s(referencia).
 */

import { mu0, IMANES } from "./constantes.js";
import { TICS_PERIODO } from "./ampere.js";

export function laminasHito1(p) {
  return [{ a: p.d_im / 2, zc: 0, b: p.L_im / 2, K: IMANES[p.grado].Br / mu0 }];
}

// Láminas del Hito 2 para una corriente I [A] y una magnetización M [A/m]
export function laminasHito2(d, I, M) {
  return [...d.fuentes.bobina.map((l) => ({ ...l, K: l.K * I })), { ...d.fuentes.nucleo, K: M }];
}

// Paso del barrido con la mayor corriente media (referencia de forma e intensidad)
export function pasoReferencia(sim) {
  return sim.pasos.reduce((mejor, s) => (s.I_prom > mejor.I_prom ? s : mejor), sim.pasos[0]);
}

/*
 * Configuración de las líneas de un hito: láminas, opciones de trazarLineas y una clave que
 * cambia solo cuando cambia la forma de las líneas (para no recalcularlas de más).
 */
export function configuracionLineas(hito, sim, n) {
  const { p, d } = sim;
  if (hito === 1) {
    const R = p.d_im / 2;
    return {
      laminas: laminasHito1(p),
      opciones: {
        n,
        rhoSiembra: 3 * R,
        escala: Math.max(R, p.L_im / 2),
        dominio: { rhoMax: 0.05, zMin: -0.06, zMax: 0.06 },
      },
      clave: `1|${p.d_im}|${p.L_im}|${p.grado}|${n}`,
    };
  }
  const ref = pasoReferencia(sim);
  const L = p.L_nuc;
  // M/I redondeado al 2 %: la forma solo cambia si ese cociente cambia
  const cociente = ref.I_prom > 0 ? ref.M_prom / ref.I_prom : 0;
  const cocienteRedondeado = cociente === 0 ? 0 : Math.round(Math.log(cociente) / Math.log(1.02));
  return {
    laminas: laminasHito2(d, ref.I_prom, ref.M_prom),
    opciones: {
      n,
      rhoSiembra: 0.03,
      escala: Math.max(p.d_nuc / 2, d.r_ext),
      dominio: { rhoMax: 0.6 * L + 0.015, zMin: -(0.75 * L + 0.02), zMax: 0.75 * L + 0.02 },
      maxPasos: 6000,
    },
    clave: `2|${p.N}|${p.capas}|${p.AWG}|${p.d_nuc}|${p.L_nuc}|${p.z_bob}|${p.nucleo}|${cocienteRedondeado}|${n}`,
    referencia: { I: ref.I_prom, M: ref.M_prom, B_s: Math.abs(ref.B_prom) },
  };
}

/*
 * Cámara lenta del PWM (Hito 2): corriente [A], magnetización [A/m] y campo en el sensor [T] en
 * la fase `fase` [s] del periodo del paso que corresponde al instante t [s].
 */
export function instantePWM(sim, t, fase) {
  const j = Math.min(sim.pasos.length - 1, Math.floor(t / sim.p.duracionPaso + 1e-9));
  const { periodo } = sim.pasos[j];
  const k = Math.min(TICS_PERIODO, Math.max(0, Math.round((fase / sim.d.T_PWM) * TICS_PERIODO)));
  return { I: periodo.i[k], M: periodo.M[k], B: periodo.B[k] };
}

// Factor de intensidad del campo en el índice actual respecto de la referencia (Hito 1: 1)
export function factorIntensidad(hito, sim, indice, referencia) {
  if (hito === 1 || !referencia || referencia.B_s === 0) return 1;
  return Math.abs(sim.r.B_s[indice]) / referencia.B_s;
}
