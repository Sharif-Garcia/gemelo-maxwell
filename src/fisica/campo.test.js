import { describe, it, expect } from "vitest";
import { mu0, AWG, FACTOR_ESMALTE } from "./constantes.js";
import {
  campoLamina, campoEjeLamina, campoEspira, inductanciaMutua, circulacionMeridional as circulacion,
} from "./campo.js";
import { integrar } from "./cuadratura.js";

// Lámina de prueba: radio 5 mm, largo 20 mm, 1 A en 120 espiras
const a = 5e-3;
const b = 10e-3;
const K = 120 / (2 * b);

const relativo = (x, ref) => Math.abs(x - ref) / Math.abs(ref);

describe("campo de una lámina cilíndrica", () => {
  it("junto al eje coincide con la fórmula exacta y Brho = -(rho/2)·dBz/dz", () => {
    // rho pequeño pero por encima del umbral del eje: usa la fórmula de Derby y Olbert
    const rho = 1e-6 * a;
    for (const z of [0, 2e-3, 9e-3, 15e-3, -30e-3]) {
      const ref = campoEjeLamina(z, a, b, K);
      const f = (u) => (a * a) / Math.pow(a * a + u * u, 1.5);
      const dBz_dz = (mu0 * K / 2) * (f(z + b) - f(z - b));
      const { Bz, Brho } = campoLamina(rho, z, a, b, K);
      expect(relativo(Bz, ref)).toBeLessThan(1e-9);
      expect(Math.abs(Brho + (rho / 2) * dBz_dz)).toBeLessThan(1e-4 * Math.abs(ref) * (rho / a));
    }
  });

  it("dentro de un solenoide largo el campo es uniforme: mu0·K", () => {
    const largo = 100 * a;
    for (const rho of [0, 0.3 * a, 0.7 * a]) {
      expect(relativo(campoLamina(rho, 0, a, largo, K).Bz, mu0 * K)).toBeLessThan(1e-3);
    }
  });

  it("lejos se comporta como un dipolo de momento K·π·a²·2b", () => {
    const m = K * Math.PI * a * a * 2 * b;
    for (const [rho, z] of [[0.6, 0.2], [0.1, 0.5], [0.4, -0.4]]) {
      const r = Math.hypot(rho, z);
      const c = mu0 * m / (4 * Math.PI * r ** 5);
      const { Brho, Bz } = campoLamina(rho, z, a, b, K);
      expect(relativo(Bz, c * (3 * z * z - r * r))).toBeLessThan(1e-2);
      expect(relativo(Brho, c * 3 * rho * z)).toBeLessThan(1e-2);
    }
  });

  it("ley de Ampère: la circulación vale mu0 por la corriente encerrada", () => {
    const campo = (rho, z) => campoLamina(rho, z, a, b, K);
    // Encierra toda la lámina: corriente K·2b
    const encerrada = circulacion(campo, 0.5 * a, 1.5 * a, -2 * b, 2 * b);
    expect(relativo(encerrada, mu0 * K * 2 * b)).toBeLessThan(1e-4);
    // No la encierra (dentro y fuera): circulación nula
    const escala = mu0 * K * 2 * b;
    expect(Math.abs(circulacion(campo, 0.1 * a, 0.8 * a, -2 * b, 2 * b)) / escala).toBeLessThan(1e-4);
    expect(Math.abs(circulacion(campo, 1.2 * a, 3 * a, -2 * b, 2 * b)) / escala).toBeLessThan(1e-4);
  });

  it("divergencia y rotacional nulos fuera de la lámina", () => {
    const h = 1e-5 * a;
    for (const [rho, z] of [[0.4 * a, 0.3 * b], [2 * a, 0.5 * b], [1.3 * a, 1.6 * b], [0.8 * a, -1.4 * b]]) {
      const B = (r, zz) => campoLamina(r, zz, a, b, K);
      const escala = Math.hypot(B(rho, z).Brho, B(rho, z).Bz) / a;
      const dRhoBrho = ((rho + h) * B(rho + h, z).Brho - (rho - h) * B(rho - h, z).Brho) / (2 * h);
      const dBz_dz = (B(rho, z + h).Bz - B(rho, z - h).Bz) / (2 * h);
      const dBrho_dz = (B(rho, z + h).Brho - B(rho, z - h).Brho) / (2 * h);
      const dBz_drho = (B(rho + h, z).Bz - B(rho - h, z).Bz) / (2 * h);
      expect(Math.abs(dRhoBrho / rho + dBz_dz) / escala).toBeLessThan(1e-5);
      expect(Math.abs(dBrho_dz - dBz_drho) / escala).toBeLessThan(1e-5);
    }
  });

  it("simetrías: Bz par y Brho impar en z", () => {
    for (const [rho, z] of [[0.5 * a, 0.4 * b], [1.7 * a, 2 * b]]) {
      const arriba = campoLamina(rho, z, a, b, K);
      const abajo = campoLamina(rho, -z, a, b, K);
      expect(relativo(abajo.Bz, arriba.Bz)).toBeLessThan(1e-12);
      expect(relativo(-abajo.Brho, arriba.Brho)).toBeLessThan(1e-12);
    }
  });

  it("valor de referencia del Hito 2: Bz en el centro sin núcleo a 1 A", () => {
    const d_hilo = FACTOR_ESMALTE * AWG[26].d_cobre;
    const r_int = 7.94e-3 / 2;
    const r_med = r_int + (3 * d_hilo) / 2;
    const L_bob = Math.ceil(120 / 3) * d_hilo;
    const Bz = campoLamina(0, 0, r_med, L_bob / 2, 120 / L_bob).Bz;
    expect(Bz * 1e3).toBeCloseTo(7.6192, 4);
    expect(mu0 * (120 / L_bob) * 1e3).toBeCloseTo(8.6189, 4);
  });
});

describe("espira e inductancia mutua", () => {
  const I = 2;

  it("sobre el eje de la espira: mu0·I·a²/(2(a²+z²)^1.5)", () => {
    for (const z of [0, 3e-3, -8e-3]) {
      const ref = mu0 * I * a * a / (2 * Math.pow(a * a + z * z, 1.5));
      expect(relativo(campoEspira(1e-9, z, a, I).Bz, ref)).toBeLessThan(1e-8);
    }
  });

  it("una lámina muy corta equivale a una espira", () => {
    const corta = 1e-5 * a;
    for (const [rho, z] of [[0.3 * a, 0.5 * a], [2 * a, -a], [0.9 * a, 2 * a]]) {
      const lamina = campoLamina(rho, z, a, corta, I / (2 * corta));
      const espira = campoEspira(rho, z, a, I);
      expect(relativo(lamina.Bz, espira.Bz)).toBeLessThan(1e-6);
      expect(relativo(lamina.Brho, espira.Brho)).toBeLessThan(1e-6);
    }
  });

  it("M es simétrica y coincide con el flujo de una espira a través de la otra", () => {
    const a1 = 9e-3;
    const a2 = 6e-3;
    const d = 4e-3;
    expect(relativo(inductanciaMutua(a1, a2, d), inductanciaMutua(a2, a1, d))).toBeLessThan(1e-13);
    const flujo = integrar((r) => campoEspira(r, d, a1, 1).Bz * 2 * Math.PI * r, 0, a2, 50, 10);
    expect(relativo(inductanciaMutua(a1, a2, d), flujo)).toBeLessThan(1e-8);
  });

  it("lejos tiende a mu0·π·a1²·a2²/(2d³)", () => {
    const d = 1;
    const ref = mu0 * Math.PI * (a * a) * (a * a) / (2 * d ** 3);
    expect(relativo(inductanciaMutua(a, a, d), ref)).toBeLessThan(1e-3);
  });
});
