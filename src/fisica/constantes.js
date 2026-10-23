/* Constantes físicas y tablas de materiales (SI). Fuente de los valores: CLAUDE.md, "Constantes y materiales". */

export const mu0 = 1.25663706212e-6;   // permeabilidad del vacío [T·m/A]
export const g = 9.81;                 // gravedad [m/s²]

// Diámetro con esmalte = FACTOR_ESMALTE × diámetro de cobre
export const FACTOR_ESMALTE = 1.08;

// Alambre de cobre esmaltado por calibre: diámetro de cobre [m] y resistencia por metro [Ω/m]
export const AWG = Object.freeze({
  26: Object.freeze({ d_cobre: 0.405e-3, rho: 0.1339 }),
  27: Object.freeze({ d_cobre: 0.361e-3, rho: 0.1688 }),
  28: Object.freeze({ d_cobre: 0.321e-3, rho: 0.2129 }),
  29: Object.freeze({ d_cobre: 0.286e-3, rho: 0.2685 }),
  30: Object.freeze({ d_cobre: 0.255e-3, rho: 0.3385 }),
});

// Imanes de neodimio: remanencia Br [T]
export const IMANES = Object.freeze({
  N35: Object.freeze({ nombre: "N35", Br: 1.19 }),
  N42: Object.freeze({ nombre: "N42", Br: 1.30 }),
  N52: Object.freeze({ nombre: "N52", Br: 1.45 }),
});

// Núcleos: permeabilidad relativa inicial y saturación mu0·Ms [T]
export const NUCLEOS = Object.freeze({
  hierro: Object.freeze({ nombre: "Hierro dulce", mu_r: 1000, mu0Ms: 2.0 }),
  acero: Object.freeze({ nombre: "Acero de tornillo", mu_r: 300, mu0Ms: 1.6 }),
  aire: Object.freeze({ nombre: "Sin núcleo", mu_r: 1, mu0Ms: 0 }),
});
