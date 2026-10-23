/* Pruebas del acomodo de etiquetas en pantalla. */
import { test, expect } from "vitest";
import { acomodarEtiquetas, anchoTexto } from "./etiquetas.js";

test("etiquetas separadas no se mueven", () => {
  const y = acomodarEtiquetas([{ x: 0, y: 0, ancho: 50, alto: 14 }, { x: 0, y: 100, ancho: 50, alto: 14 }]);
  expect(y).toEqual([0, 100]);
});

test("una etiqueta encimada se mueve lo minimo, arriba o abajo", () => {
  const y = acomodarEtiquetas([
    { x: 0, y: 50, ancho: 80, alto: 14 },
    { x: 20, y: 52, ancho: 80, alto: 14 },   // abajo: 66 (14 px) mejor que arriba: 34 (18 px)
    { x: 40, y: 55, ancho: 80, alto: 14 },   // arriba: 34 (21 px) mejor que abajo: 82 (27 px)
  ], 2);
  expect(y).toEqual([50, 66, 34]);
});

test("una etiqueta cerca del borde inferior puede subir", () => {
  const y = acomodarEtiquetas([{ x: 0, y: 700, ancho: 80, alto: 14 }, { x: 0, y: 702, ancho: 80, alto: 14 }], 2);
  expect(Math.abs(y[1] - 700)).toBe(16);
});

test("si no se tocan en x pueden compartir la altura", () => {
  const y = acomodarEtiquetas([{ x: 0, y: 10, ancho: 40, alto: 14 }, { x: 60, y: 10, ancho: 40, alto: 14 }]);
  expect(y).toEqual([10, 10]);
});

test("ancho aproximado crece con el texto", () => {
  expect(anchoTexto("n·T = 800.0 N", 13)).toBeGreaterThan(anchoTexto("N = 0 N", 13));
});
