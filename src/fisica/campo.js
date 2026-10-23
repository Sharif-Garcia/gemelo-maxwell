/*
 * Campo magnético de fuentes con simetría axial, en coordenadas cilíndricas (rho, z) con
 * origen en el centro de la fuente y eje z como eje de simetría. Unidades SI.
 *
 * - campoLamina: lámina cilíndrica de corriente (solenoide ideal, imán cilíndrico con
 *   K = Br/mu0 o núcleo magnetizado con K = M). Fórmula cerrada de Derby y Olbert (2010).
 * - campoEspira: espira circular de corriente.
 * - inductanciaMutua: dos espiras coaxiales (fórmula de Maxwell).
 */

import { mu0 } from "./constantes.js";
import { cel, elipticaK, elipticaE } from "./elipticas.js";
import { integrar } from "./cuadratura.js";

// Por debajo de este rho (relativo al radio) se usa la expresión exacta sobre el eje
const RHO_EJE = 1e-12;

// Bz sobre el eje de una lámina de radio a, semilargo b y corriente superficial K [A/m]
export function campoEjeLamina(z, a, b, K) {
  const zp = z + b;
  const zn = z - b;
  return (mu0 * K / 2) * (zp / Math.hypot(a, zp) - zn / Math.hypot(a, zn));
}

/*
 * Lámina cilíndrica de radio a, semilargo b (largo 2b) y corriente superficial K [A/m]
 * (positiva: corriente en +phi, campo interior en +z). Devuelve { Brho, Bz } en tesla.
 * Sobre la lámina (rho = a, |z| <= b) Brho diverge logarítmicamente.
 */
export function campoLamina(rho, z, a, b, K) {
  if (rho < RHO_EJE * a) return { Brho: 0, Bz: campoEjeLamina(z, a, b, K) };

  const B0 = mu0 * K / Math.PI;
  const zp = z + b;
  const zn = z - b;
  const suma = rho + a;
  const dif = a - rho;
  const denP = Math.sqrt(zp * zp + suma * suma);
  const denN = Math.sqrt(zn * zn + suma * suma);
  const alfaP = a / denP;
  const alfaN = a / denN;
  const betaP = zp / denP;
  const betaN = zn / denN;
  const gamma = dif / suma;
  const kP = Math.sqrt((zp * zp + dif * dif) / (zp * zp + suma * suma));
  const kN = Math.sqrt((zn * zn + dif * dif) / (zn * zn + suma * suma));

  const Brho = B0 * (alfaP * cel(kP, 1, 1, -1) - alfaN * cel(kN, 1, 1, -1));
  const Bz = (B0 * a / suma) *
    (betaP * cel(kP, gamma * gamma, 1, gamma) - betaN * cel(kN, gamma * gamma, 1, gamma));
  return { Brho, Bz };
}

// Espira de radio a con corriente I [A] (positiva en +phi) centrada en el origen
export function campoEspira(rho, z, a, I) {
  const suma2 = (a + rho) * (a + rho) + z * z;
  const dif2 = (a - rho) * (a - rho) + z * z;
  if (rho < RHO_EJE * a) {
    return { Brho: 0, Bz: mu0 * I * a * a / (2 * Math.pow(a * a + z * z, 1.5)) };
  }
  const k = Math.sqrt(4 * a * rho / suma2);
  const K = elipticaK(k);
  const E = elipticaE(k);
  const factor = mu0 * I / (2 * Math.PI * Math.sqrt(suma2));
  return {
    Brho: (factor * z / rho) * (-K + ((a * a + rho * rho + z * z) / dif2) * E),
    Bz: factor * (K + ((a * a - rho * rho - z * z) / dif2) * E),
  };
}

/*
 * Circulación ∮B·dl [T·m] en un rectángulo del plano meridional recorrido con normal +phi:
 * por rho1 hacia +z, por z2 hacia afuera, por rho2 hacia -z y por z1 hacia adentro.
 * campo(rho, z) devuelve { Brho, Bz }. Ley de Ampère: vale mu0 por la corriente encerrada.
 */
export function circulacionMeridional(campo, rho1, rho2, z1, z2, paneles = 200, n = 10) {
  const lado1 = integrar((z) => campo(rho1, z).Bz, z1, z2, paneles, n);
  const lado2 = integrar((r) => campo(r, z2).Brho, rho1, rho2, paneles, n);
  const lado3 = -integrar((z) => campo(rho2, z).Bz, z1, z2, paneles, n);
  const lado4 = -integrar((r) => campo(r, z1).Brho, rho1, rho2, paneles, n);
  return lado1 + lado2 + lado3 + lado4;
}

// Inductancia mutua [H] de dos espiras coaxiales de radios a1, a2 separadas d
export function inductanciaMutua(a1, a2, d) {
  const k = Math.sqrt(4 * a1 * a2 / ((a1 + a2) * (a1 + a2) + d * d));
  return mu0 * Math.sqrt(a1 * a2) * ((2 / k - k) * elipticaK(k) - (2 / k) * elipticaE(k));
}
