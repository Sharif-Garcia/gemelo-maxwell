import { describe, it, expect } from "vitest";
import { ajustarPulso, mediana, nelderMead, parametrosDelAjuste, pulsoMedido } from "./ajuste.js";
import { simular } from "../fisica/faraday.js";
import { g } from "../fisica/constantes.js";
import { ejemploHito1 } from "./ejemplos.js";
import { leerMedicionHito1 } from "./csv.js";

// Medición sintética en el formato del Arduino, con 36 ms de reposo antes de soltar el imán
const medicionSintetica = (cambios) => leerMedicionHito1(ejemploHito1({ cambios, retraso: 0.036 }));

describe("utilidades numéricas", () => {
  it("mediana de pares e impares", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
  });

  it("Nelder-Mead encuentra el mínimo de Rosenbrock", () => {
    const r = nelderMead(([x, y]) => (1 - x) ** 2 + 100 * (y - x * x) ** 2, [-1.2, 1], [0.5, 0.5], { maxIter: 2000, tol: 1e-14 });
    expect(r.x[0]).toBeCloseTo(1, 3);
    expect(r.x[1]).toBeCloseTo(1, 3);
  });
});

describe("ajuste del pulso (Hito 1)", () => {
  it("pulso medido: línea base, picos y centro", () => {
    const m = medicionSintetica({});
    const p = pulsoMedido(m);
    expect(p.base).toBeCloseTo(2.5, 2);
    expect(p.picoPositivo.valor).toBeGreaterThan(0.5);
    expect(p.picoNegativo.valor).toBeLessThan(-0.5);
    expect(p.centro).toBeGreaterThan(p.picoPositivo.t);
  });

  it("caída libre: recupera la velocidad en el centro, el cruce y la polaridad", () => {
    const x0 = -0.12;
    const m = medicionSintetica({ x0 });
    const a = ajustarPulso(m, simular({ x0: -0.06 }));
    expect(a.ok).toBe(true);
    expect(a.pol).toBe(-1);
    expect(a.v_centro).toBeCloseTo(Math.sqrt(2 * g * -x0), 1);
    expect(Math.abs(a.v_centro / Math.sqrt(2 * g * -x0) - 1)).toBeLessThan(0.02);
    expect(a.x0).toBeCloseTo(x0, 2);
    const cruce = Math.sqrt((2 * -x0) / g) + 0.036;
    expect(Math.abs(a.t_cruce - cruce)).toBeLessThan(0.5e-3);
    expect(a.r2).toBeGreaterThan(0.98);
    expect(parametrosDelAjuste(a)).toEqual({ x0: a.x0, pol: -1 });
  });

  it("velocidad constante y polaridad invertida", () => {
    const m = medicionSintetica({ tipoMovimiento: "constante", v: 2.2, pol: 1 });
    const a = ajustarPulso(m, simular({ tipoMovimiento: "constante", v: 1 }));
    expect(a.pol).toBe(1);
    expect(Math.abs(a.v_centro / 2.2 - 1)).toBeLessThan(0.02);
    expect(parametrosDelAjuste(a)).toEqual({ v: a.v_centro, pol: 1 });
  });

  it("vaivén y señales sin pulso no se ajustan", () => {
    const m = medicionSintetica({});
    expect(ajustarPulso(m, simular({ tipoMovimiento: "vaiven" })).ok).toBe(false);
    const plano = { t: Float64Array.from([0, 0.002, 0.004]), V: Float64Array.from([2.5, 2.5, 2.5]) };
    expect(ajustarPulso(plano, simular()).ok).toBe(false);
  });
});
