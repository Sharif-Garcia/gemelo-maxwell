import { describe, it, expect } from "vitest";
import { INSTANTANEOS, DERIVADOS, RESULTADOS, PRESENTACION } from "./valores.js";
import { simular as simular1 } from "../../fisica/faraday.js";
import { simular as simular2 } from "../../fisica/ampere.js";

const SIMS = { 1: simular1(), 2: simular2() };

describe.each([1, 2])("panel de valores del hito %i", (hito) => {
  const sim = SIMS[hito];

  it("cada valor instantáneo es un número en cualquier instante", () => {
    for (const indice of [0, Math.floor(sim.Nt / 2), sim.Nt - 1]) {
      const estado = { hito, sim, indice, t: sim.r.t[indice] };
      for (const f of INSTANTANEOS[hito]) expect(Number.isFinite(f.leer(estado)), f.clave).toBe(true);
    }
  });

  it("derivados y resultados se muestran como texto", () => {
    for (const f of [...DERIVADOS[hito], ...RESULTADOS[hito]]) {
      const texto = f.valor(sim);
      expect(typeof texto, f.clave).toBe("string");
      expect(texto, f.clave).not.toBe("NaN");
    }
  });

  it("las filas con color usan el de su variable en las gráficas", () => {
    expect(INSTANTANEOS[hito].filter((f) => f.color).length).toBeGreaterThan(3);
  });
});

describe("tarjeta del modo presentación", () => {
  it.each([1, 2])("hito %i: cinco valores, todos instantáneos y empezando por t", (hito) => {
    expect(PRESENTACION[hito]).toHaveLength(5);
    expect(PRESENTACION[hito][0].clave).toBe("t");
    for (const f of PRESENTACION[hito]) expect(INSTANTANEOS[hito]).toContain(f);
  });
});
