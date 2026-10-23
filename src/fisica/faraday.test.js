import { describe, it, expect } from "vitest";
import { mu0 } from "./constantes.js";
import { geometriaBobina } from "./bobina.js";
import {
  PARAMETROS_BASE, derivados, simular, indice, crearTablaFlujo, interpolar, dPhiDipoloContinuo,
} from "./faraday.js";

const relativo = (x, ref) => Math.abs(x - ref) / Math.abs(ref);
const constante = (v) => simular({ tipoMovimiento: "constante", v, x0: -0.1 });

describe("geometría y valores de referencia del Hito 1 (CLAUDE.md)", () => {
  const d = derivados(PARAMETROS_BASE);

  it("bobina: L_bob, r_ext, r_med y R_bob", () => {
    expect(d.L_bob * 1e3).toBeCloseTo(17.33, 2);
    expect(d.r_ext * 1e3).toBeCloseTo(10.39, 2);
    expect(d.r_med * 1e3).toBeCloseTo(9.693, 3);
    expect(d.R_bob).toBeCloseTo(2.59, 2);
  });

  it("las espiras se reparten en capas y suman N", () => {
    const total = d.capas.reduce((s, c) => s + c.z.length, 0);
    expect(total).toBe(200);
    expect(d.capas).toHaveLength(4);
    const impar = geometriaBobina({ N: 10, capas: 4, AWG: 28, r_int: 9e-3 });
    expect(impar.capas.map((c) => c.z.length)).toEqual([3, 3, 3, 1]);
  });

  it("momento dipolar del imán N42 de 12 × 10 mm", () => {
    expect(d.m).toBeCloseTo(1.17, 4);
  });

  it("dipolo con bobina continua de una capa: máx. dΦ/dx = 0.7763 Wb/m en x = -9.12 mm", () => {
    let mejor = { x: 0, valor: -Infinity };
    for (let x = -0.03; x <= 0.03; x += 1e-5) {
      const valor = dPhiDipoloContinuo(x, d.r_med, d.L_bob, 200, d.m);
      if (valor > mejor.valor) mejor = { x, valor };
    }
    expect(mejor.valor).toBeCloseTo(0.7763, 4);
    expect(mejor.x * 1e3).toBeCloseTo(-9.12, 1);
  });

  it("caída libre de 100 mm: v = 1.4007 m/s en el centro de la bobina", () => {
    expect(simular().eventos.v_centro).toBeCloseTo(1.4007, 4);
  });

  it("rechaza un imán más ancho que el interior de la bobina", () => {
    expect(() => simular({ d_im: 20e-3 })).toThrow();
  });
});

describe("flujo", () => {
  const p = { ...PARAMETROS_BASE, modelo: "dipolo" };

  it("la suma de espiras discretas tiende a la bobina continua del dipolo", () => {
    const q = { ...p, N: 60, capas: 1 };
    const d = derivados(q);
    const tabla = crearTablaFlujo(q, d, -0.05, 0.05);
    for (const x of [-0.04, -0.02, 0.03]) {
      expect(relativo(interpolar(tabla.dPhi, x), dPhiDipoloContinuo(x, d.capas[0].a, d.L_bob, 60, d.m))).toBeLessThan(1e-3);
    }
  });

  it("Φ tabulado (integrando dΦ/dx) coincide con la fórmula directa del dipolo", () => {
    const d = derivados(p);
    const tabla = crearTablaFlujo(p, d, -0.1, 0.1);
    for (const x of [-0.05, -0.01, 0, 0.004, 0.02]) {
      let directo = 0;
      for (const capa of d.capas) {
        for (const z of capa.z) {
          const u = x - z;
          directo += (mu0 * d.m * capa.a * capa.a) / (2 * Math.pow(capa.a * capa.a + u * u, 1.5));
        }
      }
      expect(relativo(interpolar(tabla.Phi, x), directo)).toBeLessThan(1e-4);
    }
  });

  it("el modelo cilindro tiende al dipolo con el imán lejos", () => {
    const cil = { ...PARAMETROS_BASE, modelo: "cilindro" };
    const tCil = crearTablaFlujo(cil, derivados(cil), 0.1, 0.2);
    const tDip = crearTablaFlujo(p, derivados(p), 0.1, 0.2);
    expect(relativo(interpolar(tCil.dPhi, 0.15), interpolar(tDip.dPhi, 0.15))).toBeLessThan(1e-2);
    expect(relativo(interpolar(tCil.Phi, 0.15), interpolar(tDip.Phi, 0.15))).toBeLessThan(1e-2);
  });
});

describe("ley de Faraday-Lenz", () => {
  it("∫ε dt = -(Φ_fin - Φ_inicio) y el área neta es casi cero (pregunta 1)", () => {
    for (const sim of [simular(), constante(1), simular({ tipoMovimiento: "vaiven" })]) {
      const e = sim.eventos;
      expect(Math.abs(e.integral - e.integralTeorica)).toBeLessThan(1e-4 * e.integralAbsoluta);
      expect(Math.abs(e.integral) / e.integralAbsoluta).toBeLessThan(1e-3);
    }
  });

  it("a velocidad constante el pico es proporcional a v y Δt a 1/v (pregunta 2)", () => {
    const lento = constante(0.5).eventos;
    const rapido = constante(1.5).eventos;
    expect(relativo(rapido.picoPositivo.valor / lento.picoPositivo.valor, 3)).toBeLessThan(5e-3);
    expect(relativo(rapido.picoNegativo.valor / lento.picoNegativo.valor, 3)).toBeLessThan(5e-3);
    expect(relativo(lento.deltaT * 0.5, rapido.deltaT * 1.5)).toBeLessThan(1e-2);
  });

  it("a velocidad constante los dos lóbulos son simétricos", () => {
    const e = constante(1).eventos;
    expect(relativo(-e.picoNegativo.valor, e.picoPositivo.valor)).toBeLessThan(1e-3);
  });

  it("por defecto (pol = -1) la entrada es positiva como en la guía; pol = +1 invierte la señal", () => {
    const a = simular();
    const b = simular({ pol: 1 });
    expect(a.p.pol).toBe(-1);
    expect(a.eventos.picoPositivo.t).toBeLessThan(a.eventos.picoNegativo.t);
    expect(a.eventos.picoPositivo.x).toBeLessThan(0);
    for (let k = 0; k < a.Nt; k += 97) expect(b.r.emf[k]).toBeCloseTo(-a.r.emf[k], 12);
  });
});

describe("medición en A0", () => {
  it("en reposo el ADC lee la referencia de 2.5 V (código ≈ 512)", () => {
    const sim = simular();
    expect(Math.abs(sim.muestras.codigo[0] - 512)).toBeLessThanOrEqual(2);
    expect(sim.r.V_A0[0]).toBeCloseTo(2.5, 6);
  });

  it("el ADC se recorta a 4 m/s y no a 1 m/s (pregunta 3)", () => {
    expect(constante(1).eventos.saturadas).toBe(0);
    const rapido = constante(4);
    expect(Math.abs(rapido.eventos.picoPositivo.valor)).toBeGreaterThan(2.5);
    expect(rapido.eventos.saturadas).toBeGreaterThan(0);
  });

  it("la media móvil atenúa el pico medido más cuanto mayor es N", () => {
    const picos = [1, 3, 10].map((N_filtro) => simular({ N_filtro, sigma_ruido: 0 }).eventos.picoMedidoPositivo.valor);
    expect(picos[0]).toBeGreaterThan(picos[1]);
    expect(picos[1]).toBeGreaterThan(picos[2]);
  });

  it("es determinista: la misma semilla da la misma simulación", () => {
    const a = simular();
    const b = simular();
    expect(Array.from(b.r.codigo_filtrado)).toEqual(Array.from(a.r.codigo_filtrado));
  });
});

describe("simulación", () => {
  it("indice convierte el tiempo en una muestra válida", () => {
    const sim = simular();
    expect(indice(sim, 0)).toBe(0);
    expect(indice(sim, 1e9)).toBe(sim.Nt - 1);
    expect(indice(sim, 10 * sim.p.dt)).toBe(10);
  });

  it("el escenario por defecto se calcula rápido", () => {
    simular();
    const inicio = performance.now();
    simular();
    expect(performance.now() - inicio).toBeLessThan(200);
  });
});
