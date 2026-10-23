import { describe, it, expect } from "vitest";
import { regresionLineal, perdidaLinealidad } from "./regresion.js";

const x = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

describe("regresión lineal", () => {
  it("una recta exacta da su pendiente, su ordenada y R² = 1", () => {
    const { pendiente, ordenada, r2, residuos } = regresionLineal(x, x.map((v) => 0.3 * v + 2));
    expect(pendiente).toBeCloseTo(0.3, 12);
    expect(ordenada).toBeCloseTo(2, 12);
    expect(r2).toBeCloseTo(1, 12);
    residuos.forEach((e) => expect(Math.abs(e)).toBeLessThan(1e-12));
  });

  it("con ruido R² baja y los residuos suman cero", () => {
    const y = x.map((v, i) => 0.3 * v + (i % 2 ? 1 : -1));
    const { r2, residuos } = regresionLineal(x, y);
    expect(r2).toBeLessThan(1);
    expect(r2).toBeGreaterThan(0.98);
    expect(residuos.reduce((s, e) => s + e, 0)).toBeCloseTo(0, 10);
  });
});

describe("pérdida de linealidad", () => {
  it("no la marca en una recta", () => {
    expect(perdidaLinealidad(x, x.map((v) => 2 * v)).saturado).toBe(false);
  });

  it("la marca cuando la curva se aplana al final", () => {
    const y = x.map((v) => 100 * Math.tanh(v / 60));
    const { saturado, razon } = perdidaLinealidad(x, y);
    expect(saturado).toBe(true);
    expect(razon).toBeLessThan(0.9);
  });
});
