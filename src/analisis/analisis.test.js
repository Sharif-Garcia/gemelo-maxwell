import { describe, it, expect } from "vitest";
import {
  instanteHito1, instanteHito2, nodosHito, preguntasHito1, preguntaHito2, ecuacionesHito1, ecuacionesHito2, VELOCIDADES_PREGUNTA_2,
} from "./analisis.js";
import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";
import { curvaVelocidades } from "../graficas/series.js";
import { CIRCUITOS } from "../geometria/circuitos.js";
import { posicionUbicacion } from "../geometria/montaje.js";

const sim1 = simular1();
const sim2 = simular2();

describe("Hito 1: instante", () => {
  it("ε = -pol·(dΦ/dx)·v en cada instante", () => {
    for (const k of [0, 1000, 2000, 2700, 3000]) {
      const a = instanteHito1(sim1, k);
      expect(-a.pol * a.dPhiDx * a.v).toBeCloseTo(a.emf, 9);
    }
  });

  it("Lenz: al acercarse el imán el momento inducido se le opone; al alejarse lo acompaña", () => {
    const { picoPositivo, picoNegativo } = sim1.eventos;
    const k = (t) => Math.round(t / sim1.p.dt);
    // Con pol = -1 la entrada da el pico positivo y la salida el negativo
    expect(instanteHito1(sim1, k(picoPositivo.t)).sentidoInducido).toBe(-1);
    expect(instanteHito1(sim1, k(picoNegativo.t)).sentidoInducido).toBe(1);
    // La intensidad es |ε| relativa al pico mayor
    const mayor = Math.max(picoPositivo.valor, -picoNegativo.valor);
    expect(instanteHito1(sim1, k(picoPositivo.t)).intensidad).toBeCloseTo(picoPositivo.valor / mayor, 6);
    expect(instanteHito1(sim1, 0).sentidoInducido).toBe(0);
  });

  it("el sentido de Lenz no depende de pol (es física, no el cableado)", () => {
    const otro = simular1({ pol: 1 });
    const k = Math.round(sim1.eventos.picoPositivo.t / sim1.p.dt);
    expect(instanteHito1(otro, k).sentidoInducido).toBe(instanteHito1(sim1, k).sentidoInducido);
  });
});

describe("Hito 2: instante", () => {
  it("en promedio, la corriente de la fuente más la del diodo es la del solenoide", () => {
    const a = instanteHito2(sim2, 6.5);
    expect(a.D).toBe(60);
    expect(a.promedio).toBe(true);
    expect(a.iFuente + a.iDiodo).toBeCloseTo(a.i, 12);
    expect(a.iDiodo).toBeGreaterThan(0);
    expect(a.H).toBeCloseTo(sim2.d.h_por_A * a.i, 9);
    expect(a.NI).toBeCloseTo(sim2.p.N * a.i, 9);
  });

  it("en cámara lenta: encendido, la fuente lleva la corriente; apagado, el diodo", () => {
    const T = sim2.d.T_PWM;
    const on = instanteHito2(sim2, 6.5, { camaraLenta: true, fase: 0.1 * T });
    expect(on.encendido).toBe(true);
    expect(on.iFuente).toBe(on.i);
    expect(on.iDiodo).toBe(0);
    const off = instanteHito2(sim2, 6.5, { camaraLenta: true, fase: 0.9 * T });
    expect(off.encendido).toBe(false);
    expect(off.iFuente).toBe(0);
    expect(off.iDiodo).toBe(off.i);
    expect(off.vCE).toBeGreaterThan(sim2.p.V_fuente);
  });
});

describe("nodos", () => {
  it.each([1, 2])("hito %i: cada nodo está en una ubicación del montaje", (hito) => {
    const sim = hito === 1 ? sim1 : sim2;
    const instante = hito === 1 ? instanteHito1(sim, 100) : instanteHito2(sim, 3.5);
    const nodos = nodosHito(hito, sim, instante);
    expect(new Set(nodos.map((n) => n.id)).size).toBe(nodos.length);
    for (const n of nodos) expect(() => posicionUbicacion(hito, n.ubicacion), n.id).not.toThrow();
    expect(CIRCUITOS[hito]).toBeDefined();
  });

  it("A0 muestra el voltaje y el código del instante", () => {
    const a = instanteHito1(sim1, 0);
    expect(nodosHito(1, sim1, a).find((n) => n.id === "A0").texto).toBe(`A0 = ${a.V_A0.toFixed(3)} V (${a.codigo})`);
  });
});

describe("preguntas del taller", () => {
  it("P1: la integral neta es -ΔΦ y mucho menor que el área del pulso", () => {
    const { p1 } = preguntasHito1(sim1, curvaVelocidades(sim1.p));
    expect(p1.integral).toBeCloseTo(-p1.deltaPhi, 5);
    expect(Math.abs(p1.integral)).toBeLessThan(0.01 * p1.area);
  });

  it("P2: el pico crece con v y el producto pico·Δt casi no cambia", () => {
    const { p2 } = preguntasHito1(sim1, curvaVelocidades(sim1.p));
    expect(p2.filas.map((f) => f.v)).toEqual(VELOCIDADES_PREGUNTA_2);
    expect(p2.filas[2].pico).toBeGreaterThan(p2.filas[0].pico);
    expect(p2.filas[2].deltaT).toBeLessThan(p2.filas[0].deltaT);
    expect(Math.abs(p2.razonPicos / p2.razonVelocidades - 1)).toBeLessThan(0.05);
    expect(Math.abs(p2.filas[2].producto / p2.filas[0].producto - 1)).toBeLessThan(0.1);
  });

  it("P3: A0 queda dentro de 0 a 5 V por defecto y se recorta con un imán más fuerte y rápido", () => {
    const { p3 } = preguntasHito1(sim1, curvaVelocidades(sim1.p));
    expect(p3.margenSuperior).toBeGreaterThan(0);
    expect(p3.margenInferior).toBeGreaterThan(0);
    const fuerte = simular1({ tipoMovimiento: "constante", v: 6, N: 300 });
    expect(preguntasHito1(fuerte, curvaVelocidades(fuerte.p)).p3.saturadas).toBeGreaterThan(0);
  });

  it("P4: pendiente en mT/% y la causa de la pérdida de linealidad", () => {
    const q = preguntaHito2(sim2);
    expect(q.pendiente).toBeCloseTo(sim2.eventos.regresion.pendiente * 1e3, 12);
    expect(q.causa).toBe(sim2.eventos.causa);
    expect(q.V_hall_max).toBe(sim2.pasos[10].V_hall_prom);
  });
});

describe("ecuaciones del instante", () => {
  it("Hito 1: los números de la sustitución dan ε", () => {
    const a = instanteHito1(sim1, Math.round(sim1.eventos.picoPositivo.t / sim1.p.dt));
    const lineas = ecuacionesHito1(a);
    expect(lineas[2]).toBe(`= ${a.emf.toFixed(4)} V`);
    expect(lineas[4]).toMatch(/se le opone/);
  });

  it("Hito 2: los dos aportes suman B_s y el voltaje lineal es el del Hall sin recorte", () => {
    const a = instanteHito2(sim2, 6.5);
    const lineas = ecuacionesHito2(sim2, a);
    const o = sim2.p.orientacion;
    expect(o * (a.i * sim2.d.bS_bob + a.M * sim2.d.bS_nuc)).toBeCloseTo(a.B, 12);
    expect(lineas.some((l) => l.startsWith("recortado"))).toBe(false);
    expect(lineas).toHaveLength(5);
    const lenta = ecuacionesHito2(sim2, instanteHito2(sim2, 6.5, { camaraLenta: true, fase: 0.9 * sim2.d.T_PWM }));
    expect(lenta.at(-1)).toMatch(/diodo/);
  });

  it("Hito 2: con el sensor saturado avisa el recorte", () => {
    const sim = simular2({ N: 300, R_fuente: 2, d_sensor: 1e-3 });
    expect(ecuacionesHito2(sim, instanteHito2(sim, 10.5)).some((l) => l.startsWith("recortado"))).toBe(true);
  });
});
