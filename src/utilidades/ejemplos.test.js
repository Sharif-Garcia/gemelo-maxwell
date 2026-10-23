import { describe, it, expect } from "vitest";
import { ejemploHito1, ejemploHito2 } from "./ejemplos.js";
import { leerMedicionHito1, leerMedicionHito2 } from "./csv.js";

describe("CSV de ejemplo", () => {
  it("el del Hito 1 se lee con el protocolo START/STOP y en ms", () => {
    const texto = ejemploHito1();
    expect(texto.startsWith("START\nTiempo,Voltaje\n15230,")).toBe(true);
    const m = leerMedicionHito1(texto);
    expect(m.ok).toBe(true);
    expect(m.unidadTiempo).toBe("ms");
    expect(m.t[1]).toBeCloseTo(0.002, 12);
  });

  it("el del Hito 2 va de 0 a 255 y cubre los 11 pasos del barrido", () => {
    const m = leerMedicionHito2(ejemploHito2());
    expect(m.ok).toBe(true);
    expect(m.cicloEn255).toBe(true);
    expect(m.D.length).toBe(11);
    expect(m.D[10]).toBe(100);
  });
});
