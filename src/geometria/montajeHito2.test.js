import { describe, it, expect } from "vitest";
import {
  EJE_PERNO, SENSOR, BLOQUE_V, cabezaPerno, BORNERA_SOLENOIDE, FUENTE, EXTERNOS_HITO_2,
  colocacionPerno, soportesPerno, alambresSolenoide, entradaBornera, patasSensor, ANGULO_SALIDA,
} from "./montajeHito2.js";
import { extremosBobina } from "./helice.js";
import { ZONAS } from "./mesa.js";
import { aEscena } from "./unidades.js";
import { rutaCable } from "./cables.js";
import { PARAMETROS_BASE } from "../fisica/ampere.js";
import { geometriaBobina } from "../fisica/bobina.js";
import { ajustarDependientes } from "../estado/parametros.js";

const dentro = (p, caja) => p.every((v, i) => v >= caja.min[i] - 1e-9 && v <= caja.max[i] + 1e-9);
const bobinaDe = (p) => geometriaBobina({ N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.d_nuc / 2 });

// Combinaciones extremas de los parámetros (corregidas como lo haría la interfaz)
const CASOS = [
  {},
  { d_sensor: 10e-3, L_nuc: 105e-3 },
  { d_sensor: 0.5e-3, L_nuc: 15e-3, N: 20, capas: 1 },
  { d_nuc: 12e-3, N: 600, capas: 10, L_nuc: 105e-3, d_sensor: 10e-3 },
  { N: 400, d_nuc: 3e-3, L_nuc: 100e-3, R_fuente: 2 },
  { z_bob: 60e-3, L_nuc: 105e-3 },
  { z_bob: -60e-3, L_nuc: 105e-3 },
].map((c) => ajustarDependientes(2, { ...PARAMETROS_BASE, ...c }));

describe("perno y sensor", () => {
  it("la punta del perno queda a d_sensor de la cara del sensor", () => {
    for (const p of CASOS) {
      const perno = colocacionPerno(p);
      expect(SENSOR.xCara - perno.xPunta).toBeCloseTo(aEscena(p.d_sensor), 12);
      expect(perno.xPunta - perno.xCola).toBeCloseTo(aEscena(p.L_nuc), 12);
    }
  });

  it("el perno con su cabeza y la bobina caben en la zona del solenoide en todos los casos", () => {
    const zona = ZONAS[2].solenoide;
    for (const p of CASOS) {
      const perno = colocacionPerno(p);
      const bobina = bobinaDe(p);
      const rExt = aEscena(bobina.r_ext);
      const cabeza = cabezaPerno(perno.radio);
      expect(dentro([perno.xCola - cabeza.alto, EJE_PERNO.y + cabeza.entreCaras / Math.sqrt(3), cabeza.entreCaras], zona)).toBe(true);
      expect(dentro([perno.xBobina, EJE_PERNO.y + rExt, rExt], zona)).toBe(true);
      // La bobina queda sobre el perno
      const mitad = aEscena(bobina.L_bob) / 2;
      expect(perno.xBobina - mitad).toBeGreaterThanOrEqual(perno.xCola - 1e-9);
      expect(perno.xBobina + mitad).toBeLessThanOrEqual(perno.xPunta + 1e-9);
    }
  });

  it("los bloques quedan bajo el perno y tocan el perno o la bobina, sin atravesarlos", () => {
    for (const p of CASOS) {
      const perno = colocacionPerno(p);
      const bobina = bobinaDe(p);
      const mitad = aEscena(bobina.L_bob) / 2;
      for (const { x, yTope } of soportesPerno(perno, bobina)) {
        expect(x).toBeGreaterThan(perno.xCola);
        expect(x).toBeLessThan(perno.xPunta);
        const bajoBobina = Math.abs(x - perno.xBobina) < mitad + BLOQUE_V.ancho / 2;
        const esperado = EJE_PERNO.y - (bajoBobina ? aEscena(bobina.r_ext) : perno.radio);
        expect(yTope).toBeCloseTo(esperado, 12);
      }
    }
  });

  it("con la bobina centrada los bloques sostienen el perno fuera de ella", () => {
    const p = PARAMETROS_BASE;
    const perno = colocacionPerno(p);
    for (const { yTope } of soportesPerno(perno, bobinaDe(p))) expect(yTope).toBeCloseTo(EJE_PERNO.y - perno.radio, 12);
  });

  it("las patas del sensor terminan en los terminales del netlist", () => {
    const patas = patasSensor();
    ["hall1", "hall2", "hall3"].forEach((nombre, i) => {
      const extremo = patas[i].at(-1);
      expect(extremo[0]).toBeCloseTo(EXTERNOS_HITO_2[nombre][0], 12);
      expect(extremo[2]).toBeCloseTo(EXTERNOS_HITO_2[nombre][2], 12);
      expect(extremo[1]).toBeGreaterThan(EXTERNOS_HITO_2[nombre][1]);
    });
  });
});

describe("alambres del solenoide", () => {
  it("van de los extremos del devanado a la bornera por fuera de la bobina y de los bloques", () => {
    for (const p of CASOS) {
      const perno = colocacionPerno(p);
      const bobina = bobinaDe(p);
      const extremos = extremosBobina(bobina, ANGULO_SALIDA);
      alambresSolenoide(bobina, perno).forEach((alambre, polo) => {
        const e = extremos[polo];
        expect(alambre[0][0]).toBeCloseTo(perno.xBobina + e[1], 9);
        expect(alambre[0][2]).toBeCloseTo(e[2], 9);
        expect(alambre.at(-1)).toEqual(entradaBornera(BORNERA_SOLENOIDE, polo, -1));
        for (const q of alambre.slice(1, -1)) {
          expect(q[2]).toBeGreaterThanOrEqual(BLOQUE_V.fondo / 2);
          expect(Math.hypot(q[1] - EJE_PERNO.y, q[2] - EJE_PERNO.z)).toBeGreaterThan(aEscena(bobina.r_ext));
        }
      });
    }
  });
});

describe("fuente y cables", () => {
  it("las piezas de la fuente caben en su zona", () => {
    const zona = ZONAS[2].fuente;
    const { centro, tamano } = FUENTE.adaptador;
    for (const s of [-1, 1]) expect(dentro(centro.map((v, i) => v + (s * tamano[i]) / 2), zona)).toBe(true);
    expect(dentro(FUENTE.bornera.centro, zona)).toBe(true);
    expect(dentro(FUENTE.barril.centro, zona)).toBe(true);
  });

  it("un cable con dirección de salida arranca en esa dirección", () => {
    const ruta = rutaCable([0, 1, 0], [10, 1, 0], { conectorDesde: false, conectorHasta: false, salidaDesde: [1, 0, 0] });
    expect(ruta[1][1]).toBe(1);
    expect(ruta[1][0]).toBeGreaterThan(0);
    expect(ruta[3][1]).toBeGreaterThan(1);   // el otro extremo sale hacia arriba
  });
});
