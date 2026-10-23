/* Regresión lineal por mínimos cuadrados y detección de pérdida de linealidad (pregunta 4). */

export function regresionLineal(x, y) {
  const n = x.length;
  if (n < 2) throw new Error("Se necesitan al menos dos puntos");
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
    syy += (y[i] - my) ** 2;
  }
  const pendiente = sxy / sxx;
  const ordenada = my - pendiente * mx;
  const residuos = Array.from(x, (xi, i) => y[i] - (ordenada + pendiente * xi));
  const ssRes = residuos.reduce((s, e) => s + e * e, 0);
  return { pendiente, ordenada, r2: syy === 0 ? 1 : 1 - ssRes / syy, residuos };
}

/*
 * Compara la pendiente del tramo inicial (primera mitad de los puntos) con la del tramo final
 * (últimos `puntosFinales`). Si la final cae más de `umbral` (10 %) respecto a la inicial, la
 * curva perdió linealidad. Devuelve { saturado, razon } con razon = pendiente final / inicial.
 */
export function perdidaLinealidad(x, y, { umbral = 0.1, puntosFinales = 3 } = {}) {
  const mitad = Math.max(2, Math.ceil(x.length / 2));
  const inicial = regresionLineal(x.slice(0, mitad), y.slice(0, mitad)).pendiente;
  const desde = x.length - puntosFinales;
  const final = regresionLineal(x.slice(desde), y.slice(desde)).pendiente;
  const razon = inicial === 0 ? 1 : final / inicial;
  return { saturado: razon < 1 - umbral, razon };
}
