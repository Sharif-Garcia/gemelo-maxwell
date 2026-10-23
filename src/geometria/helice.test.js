import { describe, it, expect } from "vitest";
import { puntosCapa, capasEnEscena, extremosBobina } from "./helice.js";
import {
  TUBO, TOPE, BORNERA, SOPORTE, EJE_TUBO, EXTERNOS_HITO_1, alambresBobina, alturasPinzas, alturaImanEnTubo,
} from "./montajeHito1.js";
import { ZONAS, CENTRO_BOBINA_1 } from "./mesa.js";
import { aEscena } from "./unidades.js";
import { geometriaBobina } from "../fisica/bobina.js";
import { PARAMETROS_BASE, simular } from "../fisica/faraday.js";
import { rangoParametro } from "../estado/parametros.js";

const bobina = geometriaBobina(PARAMETROS_BASE);
const dentro = (p, caja) => p.every((v, i) => v >= caja.min[i] - 1e-9 && v <= caja.max[i] + 1e-9);
const radioAlEje = (p) => Math.hypot(p[0] - EJE_TUBO.x, p[2] - EJE_TUBO.z);

describe("hélices de la bobina", () => {
  it("cada capa tiene radio constante y va de un extremo al otro", () => {
    const puntos = puntosCapa({ radio: 1, yInicio: -0.5, yFin: 0.5, vueltas: 10 });
    for (const [x, , z] of puntos) expect(Math.hypot(x, z)).toBeCloseTo(1, 12);
    expect(puntos[0][1]).toBe(-0.5);
    expect(puntos.at(-1)[1]).toBeCloseTo(0.5, 12);
    // Empieza y termina hacia la bornera (ángulo π: lado -x)
    expect(puntos[0][0]).toBeCloseTo(-1, 12);
    expect(puntos.at(-1)[0]).toBeCloseTo(-1, 12);
  });

  it("las capas alternan el sentido y tienen las espiras de la geometría del motor", () => {
    const capas = capasEnEscena(bobina);
    expect(capas).toHaveLength(4);
    expect(capas.map((c) => c.vueltas)).toEqual([50, 50, 50, 50]);
    expect(capas[0].yFin).toBeGreaterThan(capas[0].yInicio);
    expect(capas[1].yFin).toBeLessThan(capas[1].yInicio);
    expect(capas[3].radio).toBeCloseTo(aEscena(bobina.capas[3].a), 12);
  });

  it("con un número par de capas el alambre empieza y termina abajo", () => {
    const [inicio, fin] = extremosBobina(bobina);
    const abajo = aEscena(bobina.capas[0].z[0]);
    expect(inicio[1]).toBeCloseTo(abajo, 12);
    expect(fin[1]).toBeCloseTo(abajo, 12);
    expect(fin[0]).toBeLessThan(inicio[0]);   // la última capa está más afuera
  });
});

describe("montaje del Hito 1", () => {
  it("soporte, bornera, tubo y entradas de los cables caben en la zona de la bobina", () => {
    const zona = ZONAS[1].bobina;
    const { centro, tamano } = SOPORTE.base;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      expect(dentro([centro[0] + (sx * tamano[0]) / 2, centro[1], centro[2] + (sz * tamano[2]) / 2], zona)).toBe(true);
      expect(dentro([BORNERA.centro[0] + (sx * BORNERA.tamano[0]) / 2, BORNERA.centro[1], BORNERA.centro[2] + (sz * BORNERA.tamano[2]) / 2], zona)).toBe(true);
    }
    expect(dentro([EJE_TUBO.x, TUBO.yTope, EJE_TUBO.z], zona)).toBe(true);
    expect(dentro([SOPORTE.varilla.x, SOPORTE.varilla.yTope, SOPORTE.varilla.z], zona)).toBe(true);
    for (const p of Object.values(EXTERNOS_HITO_1)) expect(dentro(p, zona)).toBe(true);
  });

  it("los alambres van de los extremos de la bobina a la bornera sin atravesar la bobina", () => {
    for (const q of [PARAMETROS_BASE, { ...PARAMETROS_BASE, N: 400, capas: 8, AWG: 26, r_int: 12e-3 }]) {
      const b = geometriaBobina(q);
      const alambres = alambresBobina(b);
      const extremos = extremosBobina(b);
      alambres.forEach((alambre, polo) => {
        const esperado = extremos[polo].map((v, i) => v + CENTRO_BOBINA_1[i]);
        alambre[0].forEach((v, i) => expect(v).toBeCloseTo(esperado[i], 9));
        expect(alambre.at(-1)[0]).toBeCloseTo(BORNERA.centro[0] + BORNERA.tamano[0] / 2, 12);
        for (const p of alambre.slice(1, -1)) expect(radioAlEje(p)).toBeGreaterThan(aEscena(b.r_ext));
      });
    }
  });

  it("las pinzas nunca tocan la bobina, ni con la bobina más larga", () => {
    for (const q of [PARAMETROS_BASE, { ...PARAMETROS_BASE, N: 400, capas: 1, AWG: 26 }]) {
      const b = geometriaBobina(q);
      const [abajo, arriba] = alturasPinzas(b);
      const mitad = aEscena(b.L_bob) / 2;
      expect(abajo).toBeLessThan(CENTRO_BOBINA_1[1] - mitad);
      expect(arriba).toBeGreaterThan(CENTRO_BOBINA_1[1] + mitad);
      expect(arriba).toBeLessThan(TUBO.yTope);
    }
  });

  it("el imán más ancho permitido cabe dentro del tubo", () => {
    for (const r_int of [5e-3, 9e-3, 12e-3]) {
      const dMax = rangoParametro(1, "d_im", { ...PARAMETROS_BASE, r_int }).max;   // mm
      expect(dMax / 20).toBeLessThan(aEscena(r_int) - TUBO.pared);
    }
  });

  it("el imán nunca sale del tubo ni atraviesa el tope", () => {
    const casos = [
      {},
      { x0: -0.14, L_im: 30e-3 },
      { tipoMovimiento: "constante", v: 4 },
      { tipoMovimiento: "vaiven", A: 0.1, L_im: 30e-3 },
      { N: 400, capas: 1, AWG: 26 },
    ];
    for (const caso of casos) {
      const sim = simular(caso);
      const mitad = aEscena(sim.p.L_im) / 2;
      for (let k = 0; k < sim.Nt; k += 7) {
        const y = alturaImanEnTubo(sim.r.x[k], sim.p.L_im);
        expect(y + mitad).toBeLessThanOrEqual(TUBO.yTope);
        expect(y - mitad).toBeGreaterThanOrEqual(TOPE.yBase + TOPE.alto - 1e-9);
      }
    }
  });
});
