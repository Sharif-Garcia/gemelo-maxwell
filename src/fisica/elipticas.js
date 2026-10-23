/*
 * Integrales elípticas completas.
 *
 * cel(kc, p, c, s) es la integral elíptica completa generalizada de Bulirsch:
 *
 *   cel = ∫₀^{π/2} (c·cos²φ + s·sin²φ) / ((cos²φ + p·sin²φ) · sqrt(cos²φ + kc²·sin²φ)) dφ
 *
 * kc es el módulo complementario (kc² = 1 - k²). Algoritmo de Bulirsch tal como aparece en
 * Derby y Olbert, Am. J. Phys. 78, 229 (2010), con tolerancia de doble precisión.
 */

const TOLERANCIA = 1e-14;

export function cel(kc, p, c, s) {
  if (kc === 0) return NaN;   // diverge (punto sobre el borde de una lámina)
  let k = Math.abs(kc);
  let pp = p;
  let cc = c;
  let ss = s;
  let em = 1;

  if (p > 0) {
    pp = Math.sqrt(p);
    ss = s / pp;
  } else {
    let f = kc * kc;
    let q = 1 - f;
    const g = 1 - pp;
    f -= pp;
    q *= ss - c * pp;
    pp = Math.sqrt(f / g);
    cc = (c - ss) / g;
    ss = -q / (g * g * pp) + cc * pp;
  }

  let f = cc;
  cc += ss / pp;
  let g = k / pp;
  ss = 2 * (ss + f * g);
  pp += g;
  g = em;
  em += k;
  let kk = k;

  while (Math.abs(g - k) > g * TOLERANCIA) {
    k = 2 * Math.sqrt(kk);
    kk = k * em;
    f = cc;
    cc += ss / pp;
    g = kk / pp;
    ss = 2 * (ss + f * g);
    pp += g;
    g = em;
    em += k;
  }
  return (Math.PI / 2) * (ss + cc * em) / (em * (em + pp));
}

// Integral elíptica completa de primera especie K(k), con k el módulo (no el parámetro m = k²)
export function elipticaK(k) {
  return cel(Math.sqrt(1 - k * k), 1, 1, 1);
}

// Integral elíptica completa de segunda especie E(k)
export function elipticaE(k) {
  const kc = Math.sqrt(1 - k * k);
  return cel(kc, 1, 1, kc * kc);
}
