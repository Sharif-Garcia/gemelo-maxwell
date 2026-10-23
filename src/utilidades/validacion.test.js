import { describe, it, expect } from "vitest";
import { interpolar, errorPorcentual, tiempoCruce, validarHito1, alinearHito1, validarHito2, alinearHito2 } from "./validacion.js";
import { ajustarPulso } from "./ajuste.js";
import { ejemploHito1, ejemploHito2 } from "./ejemplos.js";
import { leerMedicionHito1, leerMedicionHito2 } from "./csv.js";
import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";
import { g } from "../fisica/constantes.js";

const medicionSintetica = (cambios) => leerMedicionHito1(ejemploHito1({ cambios, retraso: 0.036 }));
const medicion2 = (cambios) => leerMedicionHito2(ejemploHito2({ cambios }));

describe("utilidades", () => {
  it("interpolación con NaN fuera del rango", () => {
    expect(interpolar([0, 1, 2], [0, 10, 40], 1.5)).toBe(25);
    expect(interpolar([0, 1, 2], [0, 10, 40], 2)).toBe(40);
    expect(Number.isNaN(interpolar([0, 1], [0, 1], 1.1))).toBe(true);
  });

  it("error porcentual respecto del valor medido", () => {
    expect(errorPorcentual(1.1, 1)).toBeCloseTo(10, 12);
    expect(errorPorcentual(-0.9, -1)).toBeCloseTo(10, 12);
    expect(errorPorcentual(1, 0)).toBeNull();
  });

  it("instante de cruce del imán por el centro", () => {
    const sim = simular1({ x0: -0.1 });
    expect(tiempoCruce(sim.r)).toBeCloseTo(Math.sqrt(0.2 / g), 5);
  });
});

describe("Hito 1", () => {
  it("con los mismos parámetros el gemelo coincide con su propia medición", () => {
    const sim = simular1();
    const m = medicionSintetica({});
    const v = validarHito1(sim, m, ajustarPulso(m, sim));
    expect(Math.abs(v.desfase - 0.036)).toBeLessThan(0.5e-3);
    expect(v.r2).toBeGreaterThan(0.98);
    expect(v.nrmse).toBeLessThan(0.05);
    const [pos, neg, dt] = v.filas;
    expect(Math.abs(pos.error)).toBeLessThan(10);   // la medición tiene ruido y cuantización
    expect(Math.abs(neg.error)).toBeLessThan(10);
    expect(Math.abs(dt.error)).toBeLessThan(15);   // Δt medido se cuantiza a Ts = 2 ms
    expect(v.filas[4].diferencia).toBe(true);
  });

  it("un gemelo con otra velocidad da errores grandes", () => {
    const m = medicionSintetica({ x0: -0.14 });
    const v = validarHito1(simular1({ x0: -0.04 }), m);
    expect(v.filas[0].error).toBeLessThan(-20);
    expect(v.filas[2].error).toBeGreaterThan(20);
  });

  it("la medición alineada cae sobre el pulso del gemelo", () => {
    const sim = simular1();
    const m = medicionSintetica({});
    const { emf, codigo } = alinearHito1(sim, m, ajustarPulso(m, sim));
    expect(emf.length).toBe(sim.Nt);
    const k = Math.round(sim.eventos.picoPositivo.t / sim.p.dt);
    expect(emf[k]).toBeGreaterThan(0.5 * sim.eventos.picoPositivo.valor);
    expect(codigo[k]).toBeGreaterThan(512);
  });
});

describe("Hito 2", () => {
  it("con los mismos parámetros la pendiente coincide", () => {
    const v = validarHito2(simular2(), medicion2({}));
    expect(v.ok).toBe(true);
    expect(Math.abs(v.filas[0].error)).toBeLessThan(5);   // la medición tiene ruido y cuantización
    expect(v.r2).toBeGreaterThan(0.99);
    expect(v.puntos.length).toBe(11);
  });

  it("menos espiras en la medición: la pendiente del gemelo es mayor", () => {
    const v = validarHito2(simular2(), medicion2({ N: 60 }));
    expect(v.filas[0].error).toBeGreaterThan(50);
  });

  it("alineación por ciclo de trabajo en la malla del gemelo", () => {
    const sim = simular2();
    const m = medicion2({});
    const a = alinearHito2(sim, m);
    expect(a.V_hall.length).toBe(sim.Nt);
    expect(a.V_hall[sim.Nt - 1]).toBeCloseTo(m.V[m.V.length - 1], 12);
    expect(a.dispersion.every((x) => x !== null)).toBe(true);
    expect(a.dispersion.length).toBe(sim.pasos.length);
    // Una medición con solo algunos pasos deja huecos
    const parcial = { D: Float64Array.from([0, 50, 100]), V: Float64Array.from([2.5, 3, 3.3]), codigos: Float64Array.from([512, 614, 676]) };
    const b = alinearHito2(sim, parcial);
    expect(b.dispersion.filter((x) => x !== null).length).toBe(3);
    expect(b.B_s[0]).toBe(0);
  });
});
