import { describe, it, expect } from "vitest";
import { cel, elipticaK, elipticaE } from "./elipticas.js";

// Cálculo independiente por media aritmético-geométrica: K = π/(2·AGM(1, kc)), E = K·(1 - Σ 2^(n-1) c_n²)
function porAGM(k) {
  let a = 1;
  let b = Math.sqrt(1 - k * k);
  let c = k;
  let suma = 0.5 * c * c;
  let potencia = 0.5;
  for (let i = 0; i < 40 && Math.abs(c) > 1e-16 * a; i++) {
    const an = (a + b) / 2;
    c = (a - b) / 2;
    b = Math.sqrt(a * b);
    a = an;
    potencia *= 2;
    suma += potencia * c * c;
  }
  const K = Math.PI / (2 * a);
  return { K, E: K * (1 - suma) };
}

describe("integrales elípticas", () => {
  it("K(0) = E(0) = π/2", () => {
    expect(elipticaK(0)).toBeCloseTo(Math.PI / 2, 14);
    expect(elipticaE(0)).toBeCloseTo(Math.PI / 2, 14);
  });

  it("valores de tabla con k = 1/√2", () => {
    const k = Math.SQRT1_2;
    expect(elipticaK(k)).toBeCloseTo(1.8540746773013719, 12);
    expect(elipticaE(k)).toBeCloseTo(1.3506438810476755, 12);
  });

  it("coinciden con la media aritmético-geométrica en todo el rango", () => {
    for (const k of [0.05, 0.2, 0.4, 0.6, 0.8, 0.9, 0.99, 0.999]) {
      const ref = porAGM(k);
      expect(Math.abs(elipticaK(k) - ref.K) / ref.K).toBeLessThan(1e-12);
      expect(Math.abs(elipticaE(k) - ref.E) / ref.E).toBeLessThan(1e-12);
    }
  });

  // El campo solo usa p = γ² >= 0; con p < 0 la integral es un valor principal y no se compara así
  it("cel coincide con la integral directa (p > 0)", () => {
    const directa = (kc, p, c, s) => {
      const n = 20000;
      let suma = 0;
      for (let i = 0; i < n; i++) {
        const fi = (Math.PI / 2) * (i + 0.5) / n;
        const co = Math.cos(fi) ** 2;
        const si = Math.sin(fi) ** 2;
        suma += (c * co + s * si) / ((co + p * si) * Math.sqrt(co + kc * kc * si));
      }
      return suma * (Math.PI / 2) / n;
    };
    for (const [kc, p, c, s] of [[0.3, 0.25, 1, 0.5], [0.7, 0.04, 1, 0.2], [0.5, 1, 1, -1]]) {
      expect(cel(kc, p, c, s)).toBeCloseTo(directa(kc, p, c, s), 7);
    }
  });
});
