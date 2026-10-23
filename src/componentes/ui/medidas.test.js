/* Pruebas del area libre de la escena (cuadro de la camara). */
import { test, expect } from "vitest";
import { MEDIDAS, areaVisible, bordesLaterales } from "./medidas.js";

test("el area libre queda entre los paneles y las barras", () => {
  const abiertos = areaVisible(1366, 480, { parametros: true, valores: true });
  const m = MEDIDAS.margen;
  expect(abiertos.x).toBe(m + MEDIDAS.anchoParametros + m);
  expect(abiertos.y).toBe(m + MEDIDAS.altoVistas + m);
  expect(abiertos.x + abiertos.ancho).toBe(1366 - (m + MEDIDAS.anchoValores + m));
  expect(abiertos.y + abiertos.alto).toBe(480 - (m + MEDIDAS.altoReproduccion + m));
});

test("al plegar un panel el area libre crece hacia ese lado", () => {
  const abiertos = areaVisible(1366, 480, { parametros: true, valores: true });
  const plegado = areaVisible(1366, 480, { parametros: false, valores: true });
  expect(plegado.x).toBeLessThan(abiertos.x);
  expect(plegado.x + plegado.ancho).toBe(abiertos.x + abiertos.ancho);
  expect(bordesLaterales({ parametros: false, valores: false }).izquierda).toBe(2 * MEDIDAS.margen + MEDIDAS.anchoPlegado);
});

test("en modo presentacion el area libre ocupa casi todo el lienzo", () => {
  const p = areaVisible(1366, 768, { parametros: true, valores: true }, true);
  expect(p.x).toBe(MEDIDAS.margen);
  expect(p.y).toBe(MEDIDAS.margen);
  expect(p.ancho).toBe(1366 - 2 * MEDIDAS.margen);
  expect(p.alto).toBe(768 - MEDIDAS.margen - (2 * MEDIDAS.margen + MEDIDAS.altoReproduccion));
});

test("nunca devuelve un area vacia", () => {
  const a = areaVisible(100, 50, { parametros: true, valores: true });
  expect(a.ancho).toBeGreaterThan(0);
  expect(a.alto).toBeGreaterThan(0);
});
