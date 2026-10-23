import { describe, it, expect } from "vitest";
import { campoLamina } from "./campo.js";
import { PARAMETROS_BASE, derivados, campoSensor } from "./ampere.js";
import { crearRejilla, muestrearRejilla, rejillasAmpere, campoCombinado } from "./rejillaCampo.js";

const p = PARAMETROS_BASE;
const d = derivados(p);
const relativo = (x, ref) => Math.abs(x - ref) / Math.abs(ref);

describe("rejillas del campo", () => {
  const lamina = { a: 4e-3, zc: 1e-3, b: 10e-3, K: 1000 };
  const opciones = { rhoMax: 20e-3, zMin: -30e-3, zMax: 30e-3, nRho: 41, nZ: 121 };
  const rejilla = crearRejilla([lamina], opciones);

  it("en los nodos coincide con el cálculo directo (precisión de Float32)", () => {
    for (const [i, j] of [[0, 60], [3, 10], [20, 100], [40, 0]]) {
      const rho = i * rejilla.drho;
      const z = rejilla.z0 + j * rejilla.dz;
      const directo = campoLamina(rho, z - lamina.zc, lamina.a, lamina.b, lamina.K);
      expect(relativo(rejilla.Bz[j * rejilla.nRho + i], directo.Bz)).toBeLessThan(1e-6);
      if (i > 0) expect(relativo(rejilla.Brho[j * rejilla.nRho + i], directo.Brho)).toBeLessThan(1e-6);
    }
  });

  it("la interpolación bilineal se acerca al campo entre nodos lejos de la lámina", () => {
    for (const [rho, z] of [[1.3e-3, 2.2e-3], [12.7e-3, -17.1e-3], [7.4e-3, 21.3e-3]]) {
      const directo = campoLamina(rho, z - lamina.zc, lamina.a, lamina.b, lamina.K);
      expect(relativo(muestrearRejilla(rejilla, rho, z).Bz, directo.Bz)).toBeLessThan(2e-2);
    }
  });

  it("no deja valores infinitos sobre la lámina", () => {
    for (let k = 0; k < rejilla.Brho.length; k++) {
      expect(Number.isFinite(rejilla.Brho[k])).toBe(true);
      expect(Number.isFinite(rejilla.Bz[k])).toBe(true);
    }
  });
});

describe("rejillas del Hito 2", () => {
  const rejillas = rejillasAmpere(d.fuentes);

  it("el núcleo centrado da Bz par en z", () => {
    const { nuc } = rejillas;
    for (const [i, j] of [[5, 20], [30, 70], [60, 10]]) {
      const espejo = nuc.nZ - 1 - j;
      expect(nuc.Bz[espejo * nuc.nRho + i]).toBeCloseTo(nuc.Bz[j * nuc.nRho + i], 9);
    }
  });

  it("I·b_bob + M·b_nuc reproduce el campo del sensor de ampere.js", () => {
    const I = 0.8;
    const { M, B } = campoSensor(I, p, d);
    expect(relativo(campoCombinado(rejillas, I, M, 0, d.z_sensor).Bz, B)).toBeLessThan(1e-2);
  });
});
