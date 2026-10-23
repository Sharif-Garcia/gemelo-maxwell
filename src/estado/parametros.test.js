import { describe, it, expect } from "vitest";
import {
  DEFINICIONES, GRUPOS, rangoParametro, acotarValor, ajustarDependientes, esVisible,
  formatearValor, desdeMostrado, leerCampo, esOpcion,
} from "./parametros.js";
import { PARAMETROS_DEFECTO, ESCENARIOS, parametrosDeEscenario } from "./escenarios.js";
import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";

const SIMULAR = { 1: simular1, 2: simular2 };

// Un valor está dentro de su definición (rango con dependencias u opción válida)
function dentroDeRango(hito, nombre, p) {
  const def = DEFINICIONES[hito][nombre];
  if (esOpcion(def)) return def.opciones.some((o) => o.valor === p[nombre]);
  const { min, max } = rangoParametro(hito, nombre, p);
  const mostrado = p[nombre] * (def.escala ?? 1);
  return mostrado >= min - 1e-9 && mostrado <= max + 1e-9;
}

describe("definiciones", () => {
  for (const hito of [1, 2]) {
    it(`hito ${hito}: cada parámetro de los grupos existe en el motor y aparece una sola vez`, () => {
      const nombres = GRUPOS[hito].flatMap((g) => g.parametros);
      expect(new Set(nombres).size).toBe(nombres.length);
      for (const nombre of nombres) {
        expect(DEFINICIONES[hito][nombre]).toBeDefined();
        expect(PARAMETROS_DEFECTO[hito]).toHaveProperty(nombre);
      }
    });

    it(`hito ${hito}: los valores por defecto están dentro de sus rangos`, () => {
      for (const nombre of Object.keys(DEFINICIONES[hito])) {
        expect(dentroDeRango(hito, nombre, PARAMETROS_DEFECTO[hito]), nombre).toBe(true);
      }
    });
  }
});

describe("acotar al rango y al paso", () => {
  const p1 = PARAMETROS_DEFECTO[1];

  it("trabaja en SI con la escala de la interfaz", () => {
    expect(acotarValor(1, "r_int", 8.26e-3, p1)).toBeCloseTo(8.5e-3, 12);
    expect(acotarValor(1, "r_int", 50e-3, p1)).toBeCloseTo(12e-3, 12);
    expect(acotarValor(1, "Ts", 2.4e-3, p1)).toBeCloseTo(2e-3, 12);
  });

  it("las opciones deben ser válidas", () => {
    expect(acotarValor(1, "AWG", 30, p1)).toBe(30);
    expect(() => acotarValor(1, "AWG", 31, p1)).toThrow();
    expect(acotarValor(2, "con_diodo", false, PARAMETROS_DEFECTO[2])).toBe(false);
  });

  it("capas nunca supera N", () => {
    const q = ajustarDependientes(1, { ...p1, N: 20, capas: 8 });
    expect(q.capas).toBeLessThanOrEqual(8);
    expect(ajustarDependientes(1, { ...p1, N: 20, capas: 30 }).capas).toBe(8);
    expect(rangoParametro(1, "capas", { ...p1, N: 3 }).max).toBe(3);
  });

  it("hito 1: el imán siempre cabe en el tubo", () => {
    const q = ajustarDependientes(1, { ...p1, r_int: 6e-3, d_im: 20e-3 });
    expect(q.d_im).toBeLessThanOrEqual(2 * q.r_int - 2e-3 + 1e-12);
  });

  it("hito 2: el núcleo es más largo que su diámetro y la bobina cabe en él", () => {
    const p2 = PARAMETROS_DEFECTO[2];
    const q = ajustarDependientes(2, { ...p2, d_nuc: 12e-3, L_nuc: 15e-3, z_bob: 60e-3 });
    expect(q.L_nuc).toBeGreaterThanOrEqual(1.5 * q.d_nuc - 1e-12);
    const { min, max } = rangoParametro(2, "z_bob", p2);
    expect(min).toBe(-max);
    expect(max).toBe(16);   // (50 - 17.5)/2 = 16.25 mm, al paso de 0.5 mm
  });
});

describe("visibilidad y formato", () => {
  it("los parámetros del movimiento dependen de su tipo", () => {
    const p = PARAMETROS_DEFECTO[1];
    expect(esVisible(1, "v", p)).toBe(false);
    expect(esVisible(1, "v", { ...p, tipoMovimiento: "constante" })).toBe(true);
    expect(esVisible(1, "A", { ...p, tipoMovimiento: "vaiven" })).toBe(true);
    expect(esVisible(1, "x0", { ...p, tipoMovimiento: "vaiven" })).toBe(false);
    expect(esVisible(1, "N", p)).toBe(true);
  });

  it("formatea en unidades de la interfaz", () => {
    expect(formatearValor(1, "x0", -0.1)).toBe("-100");
    expect(formatearValor(2, "d_nuc", 7.94e-3)).toBe("7.94");
    expect(formatearValor(2, "R_base", 1000)).toBe("1 kΩ");
    expect(desdeMostrado(1, "r_int", 9)).toBeCloseTo(9e-3, 15);
  });

  it("lee campos con coma decimal y rechaza texto", () => {
    expect(leerCampo("2,5")).toBe(2.5);
    expect(leerCampo(" -100 ")).toBe(-100);
    expect(leerCampo("abc")).toBeNull();
    expect(leerCampo("")).toBeNull();
  });
});

describe("escenarios", () => {
  for (const hito of [1, 2]) {
    for (const escenario of ESCENARIOS[hito]) {
      it(`hito ${hito}, ${escenario.nombre}: parámetros válidos y simulación sin errores`, () => {
        const p = parametrosDeEscenario(hito, escenario.id);
        for (const nombre of Object.keys(escenario.cambios)) {
          expect(dentroDeRango(hito, nombre, p), nombre).toBe(true);
        }
        expect(ajustarDependientes(hito, p)).toEqual(p);
        expect(() => SIMULAR[hito](p)).not.toThrow();
      });
    }
  }

  it("cada escenario de saturación del hito 2 produce su causa", () => {
    expect(simular2(parametrosDeEscenario(2, "saturacion-sensor")).eventos.causa).toBe("sensor");
    expect(simular2(parametrosDeEscenario(2, "saturacion-nucleo")).eventos.causa).toBe("nucleo");
    expect(simular1(parametrosDeEscenario(1, "saturacion-adc")).eventos.saturadas).toBeGreaterThan(0);
  });
});
