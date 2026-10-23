import { describe, it, expect } from "vitest";
import { rutaCable, geometriaAxial, CONECTOR, llevaConector } from "./cables.js";
import { bandasResistencia } from "./resistencia.js";
import { CIRCUITOS } from "./circuitos.js";
import { posicionUbicacion, salidaUbicacion } from "./montaje.js";
import { ALTO_TAPETE } from "./mesa.js";

const nombres = (ohmios) => bandasResistencia(ohmios).map((b) => b.nombre);

describe("código de colores", () => {
  it("valores de la guía", () => {
    expect(nombres(10000)).toEqual(["café", "negro", "naranja", "dorado"]);
    expect(nombres(1000)).toEqual(["café", "negro", "rojo", "dorado"]);
    expect(nombres(2200)).toEqual(["rojo", "rojo", "rojo", "dorado"]);
    expect(nombres(470)).toEqual(["amarillo", "violeta", "café", "dorado"]);
    expect(nombres(100)).toEqual(["café", "negro", "café", "dorado"]);
  });
});

describe("rutas de cables", () => {
  it("empiezan en lo alto del conector y terminan en el punto libre", () => {
    const a = [0, 1, 0];
    const b = [10, 2, 3];
    const ruta = rutaCable(a, b, { conectorHasta: false });
    expect(ruta[0]).toEqual([0, 1 + CONECTOR.alto, 0]);
    expect(ruta.at(-1)).toEqual(b);
    const cima = Math.max(...ruta.map((p) => p[1]));
    expect(ruta[2][1]).toBe(cima);
  });

  it.each([1, 2])("hito %i: ningún punto de control de los cables queda bajo el tapete", (hito) => {
    for (const cable of CIRCUITOS[hito].cables) {
      const ruta = rutaCable(posicionUbicacion(hito, cable.desde), posicionUbicacion(hito, cable.hasta), {
        conectorDesde: llevaConector(cable.desde),
        conectorHasta: llevaConector(cable.hasta),
        salidaDesde: salidaUbicacion(hito, cable.desde),
        salidaHasta: salidaUbicacion(hito, cable.hasta),
      });
      for (const p of ruta) expect(p[1]).toBeGreaterThan(ALTO_TAPETE);
    }
  });
});

describe("componentes axiales", () => {
  it("las patas entran a los agujeros y el cuerpo queda centrado sobre ellos", () => {
    const a = [0, 1, 0];
    const b = [1.016, 1, 0];
    const g = geometriaAxial(a, b);
    expect(g.centro[0]).toBeCloseTo(0.508, 12);
    expect(g.centro[1]).toBeGreaterThan(1);
    expect(g.patas[0][0]).toEqual([0, 0.7, 0]);
    expect(g.patas[1][0][0]).toBe(1.016);
    expect(g.patas[0][2][0]).toBeCloseTo(0.508 - g.largoCuerpo / 2, 12);
  });

  it("rechaza agujeros más cerca que el largo del cuerpo", () => {
    expect(() => geometriaAxial([0, 1, 0], [0.5, 1, 0])).toThrow();
  });
});
