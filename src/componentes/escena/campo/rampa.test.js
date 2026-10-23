import { describe, it, expect } from "vitest";
import { RAMPA_AZUL, escalaLog, posicionEscala, colorRampa, marcasEscala } from "./rampa.js";

const luminancia = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("escala de color de |B|", () => {
  it("es un solo tono que se oscurece de forma monótona", () => {
    let anterior = Infinity;
    for (let k = 0; k <= 20; k++) {
      const l = luminancia(colorRampa(k / 20));
      expect(l).toBeLessThan(anterior);
      anterior = l;
    }
    const [r, g, b] = colorRampa(0.5);
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
  });

  it("los extremos son los pasos 100 y 700 de la rampa", () => {
    expect(colorRampa(0)).toEqual([0xcd, 0xe2, 0xfb]);
    expect(colorRampa(1)).toEqual([0x0d, 0x36, 0x6b]);
    expect(RAMPA_AZUL).toHaveLength(13);
  });

  it("escala logarítmica de 3 décadas por debajo del máximo", () => {
    const escala = escalaLog(0.5);
    expect(posicionEscala(0.5, escala)).toBeCloseTo(1, 12);
    expect(posicionEscala(0.0005, escala)).toBeCloseTo(0, 12);
    expect(posicionEscala(0.5e-1 * Math.sqrt(0.1), escala)).toBeCloseTo(0.5, 12);
    expect(posicionEscala(0, escala)).toBe(0);
    expect(posicionEscala(10, escala)).toBe(1);
  });

  it("las marcas caen en las potencias de 10 (en mT)", () => {
    const marcas = marcasEscala(escalaLog(0.5));
    expect(marcas.map((m) => m.mT)).toEqual([1, 10, 100]);
    for (const m of marcas) expect(m.t).toBeGreaterThanOrEqual(0);
  });
});
