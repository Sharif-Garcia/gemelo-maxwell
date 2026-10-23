import { describe, it, expect } from "vitest";
import { mu0 } from "./constantes.js";
import { campoLamina } from "./campo.js";
import { crearCampo, flujoEncerrado, sembrarPorFlujo, trazarLinea, trazarLineas } from "./lineasCampo.js";

// Imán del Hito 1 por defecto: N42, 12 × 10 mm
const IMAN = [{ a: 6e-3, zc: 0, b: 5e-3, K: 1.3 / mu0 }];
const DOMINIO_IMAN = { rhoMax: 0.05, zMin: -0.05, zMax: 0.05 };

describe("campo y siembra", () => {
  it("el campo suma las láminas y es simétrico en rho", () => {
    const laminas = [...IMAN, { a: 3e-3, zc: 4e-3, b: 2e-3, K: 1000 }];
    const campo = crearCampo(laminas);
    const directo = laminas.reduce((s, l) => s + campoLamina(2e-3, 1e-3 - l.zc, l.a, l.b, l.K).Bz, 0);
    expect(campo(2e-3, 1e-3).Bz).toBeCloseTo(directo, 12);
    expect(campo(-2e-3, 1e-3).Bz).toBeCloseTo(campo(2e-3, 1e-3).Bz, 12);
    expect(campo(-2e-3, 1e-3).Brho).toBeCloseTo(-campo(2e-3, 1e-3).Brho, 12);
  });

  it("cada semilla encierra (i - 1/2)/n del flujo y todas quedan dentro del imán", () => {
    const campo = crearCampo(IMAN);
    const n = 6;
    const semillas = sembrarPorFlujo(campo, { rhoMax: 0.02, n });
    const { radios, flujo } = flujoEncerrado(campo, 0, 0.02);
    const total = flujo.at(-1);
    const flujoEn = (rho) => {
      const j = radios.findIndex((r) => r >= rho);
      const f = (rho - radios[j - 1]) / (radios[j] - radios[j - 1]);
      return flujo[j - 1] + f * (flujo[j] - flujo[j - 1]);
    };
    semillas.forEach((rho, i) => {
      expect(flujoEn(rho) / total).toBeCloseTo((i + 0.5) / n, 2);
      expect(rho).toBeLessThan(6e-3);
    });
    // El flujo se acaba justo afuera de la lámina, donde Bz cambia de signo
    expect(radios.at(-1)).toBeGreaterThan(5.9e-3);
    expect(radios.at(-1)).toBeLessThan(6.2e-3);
  });
});

describe("trazado", () => {
  const campo = crearCampo(IMAN);
  const opciones = { dominio: { rhoMax: 0.2, zMin: -0.2, zMax: 0.2 }, escala: 6e-3, maxPasos: 20000 };

  it("la línea es tangente al campo en todos sus tramos", () => {
    const { rho, z } = trazarLinea(campo, 3e-3, 0, opciones);
    for (let i = 0; i < rho.length - 1; i += 7) {
      const dr = rho[i + 1] - rho[i];
      const dz = z[i + 1] - z[i];
      const c = campo((rho[i] + rho[i + 1]) / 2, (z[i] + z[i + 1]) / 2);
      const cruz = Math.abs(dr * c.Bz - dz * c.Brho) / (Math.hypot(dr, dz) * Math.hypot(c.Brho, c.Bz));
      expect(cruz).toBeLessThan(0.02);
      // Sentido de B: el producto punto es positivo
      expect(dr * c.Brho + dz * c.Bz).toBeGreaterThan(0);
    }
  });

  it("con dominio amplio la línea se cierra sobre su semilla", () => {
    const linea = trazarLinea(campo, 3e-3, 0, opciones);
    expect(linea.cerrada).toBe(true);
    expect(linea.rho.at(-1)).toBe(3e-3);
    expect(linea.z.at(-1)).toBe(0);
  });

  it("la fuente simétrica da líneas simétricas respecto de su plano central", () => {
    const { z } = trazarLinea(campo, 4e-3, 0, opciones);
    const zMax = Math.max(...z);
    const zMin = Math.min(...z);
    expect(Math.abs(zMax + zMin) / zMax).toBeLessThan(0.02);
  });

  it("las líneas que salen del dominio se completan hacia atrás y empiezan y terminan en su borde", () => {
    const { lineas } = trazarLineas(IMAN, { n: 5, rhoSiembra: 0.02, escala: 6e-3, dominio: DOMINIO_IMAN });
    for (const l of lineas.filter((x) => !x.cerrada)) {
      const fuera = (i) => l.rho[i] >= DOMINIO_IMAN.rhoMax || l.z[i] <= DOMINIO_IMAN.zMin || l.z[i] >= DOMINIO_IMAN.zMax;
      expect(fuera(0)).toBe(true);
      expect(fuera(l.rho.length - 1)).toBe(true);
    }
  });

  it("el imán del Hito 1 se traza rápido y el campo en su superficie ronda Br/2", () => {
    const inicio = performance.now();
    const { lineas, Bmax } = trazarLineas(IMAN, { n: 7, rhoSiembra: 0.02, escala: 6e-3, dominio: DOMINIO_IMAN });
    expect(performance.now() - inicio).toBeLessThan(1000);
    expect(lineas).toHaveLength(7);
    expect(Bmax).toBeGreaterThan(0.3);
    expect(Bmax).toBeLessThan(1.3);
  });
});
