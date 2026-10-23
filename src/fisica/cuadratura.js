/* Cuadratura de Gauss-Legendre (nodos por Newton sobre los polinomios de Legendre). */

const cache = new Map();

// Nodos y pesos en [-1, 1] para n puntos
export function nodosGaussLegendre(n) {
  if (cache.has(n)) return cache.get(n);
  const x = new Float64Array(n);
  const w = new Float64Array(n);
  const m = Math.ceil(n / 2);
  for (let i = 0; i < m; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));
    let dp = 0;
    for (let iter = 0; iter < 100; iter++) {
      let p0 = 1;
      let p1 = 0;
      for (let j = 0; j < n; j++) {
        const p2 = p1;
        p1 = p0;
        p0 = ((2 * j + 1) * z * p1 - j * p2) / (j + 1);
      }
      dp = n * (z * p0 - p1) / (z * z - 1);
      const dz = p0 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x[i] = -z;
    x[n - 1 - i] = z;
    w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * dp * dp);
  }
  const nodos = { x, w };
  cache.set(n, nodos);
  return nodos;
}

// ∫ₐᵇ f(t) dt con `paneles` tramos iguales de `n` puntos cada uno
export function integrar(f, a, b, paneles = 1, n = 8) {
  const { x, w } = nodosGaussLegendre(n);
  const h = (b - a) / paneles;
  let suma = 0;
  for (let p = 0; p < paneles; p++) {
    const centro = a + (p + 0.5) * h;
    for (let i = 0; i < n; i++) suma += w[i] * f(centro + 0.5 * h * x[i]);
  }
  return 0.5 * h * suma;
}
