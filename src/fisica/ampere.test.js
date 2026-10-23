import { describe, it, expect } from "vitest";
import {
  PARAMETROS_BASE, TICS_PERIODO, derivados, factorDesmagnetizante, magnetizacion, campoSensor,
  regimenPWM, simular, indice,
} from "./ampere.js";

const p = { ...PARAMETROS_BASE };
const d = derivados(p);
const relativo = (x, ref) => Math.abs(x - ref) / Math.abs(ref);

// Escenarios de CLAUDE.md que deben producir cada causa de pérdida de linealidad
const SATURACION_SENSOR = { N: 300, R_fuente: 2, d_sensor: 1e-3 };
const SATURACION_NUCLEO = { N: 400, d_nuc: 3e-3, L_nuc: 100e-3, R_fuente: 2 };

describe("valores de referencia del Hito 2 (CLAUDE.md)", () => {
  it("solenoide: L_bob, r_ext y R_bob", () => {
    expect(d.L_bob * 1e3).toBeCloseTo(17.50, 2);
    expect(d.r_ext * 1e3).toBeCloseTo(5.28, 2);
    expect(d.R_bob).toBeCloseTo(0.467, 3);
  });

  it("núcleo: m_r, N_d y chi_a del hierro dulce", () => {
    expect(d.m_r).toBeCloseTo(6.2972, 4);
    expect(d.N_d).toBeCloseTo(0.04034, 5);
    expect(d.chi_a).toBeCloseTo(24.19, 2);
  });

  it("electrónica: f_PWM de D9, I_on y beta·I_B", () => {
    expect(d.f_PWM).toBeCloseTo(490.20, 2);
    expect(d.I_on).toBeCloseTo(1.0509, 4);
    expect(d.I_C_max).toBeCloseTo(3.6, 10);
  });

  it("el factor desmagnetizante de una esfera (m_r -> 1) tiende a 1/3 y baja con el largo", () => {
    expect(factorDesmagnetizante(1.0001)).toBeCloseTo(1 / 3, 3);
    expect(factorDesmagnetizante(20)).toBeLessThan(factorDesmagnetizante(5));
  });
});

describe("núcleo", () => {
  it("M es lineal con H pequeño y nunca supera Ms", () => {
    expect(relativo(magnetizacion(1, d), d.chi_a)).toBeLessThan(1e-4);
    for (const H of [1e3, 1e5, 1e7, 1e10]) expect(magnetizacion(H, d)).toBeLessThan(d.Ms);
    expect(relativo(magnetizacion(1e12, d), d.Ms)).toBeLessThan(1e-3);
    expect(magnetizacion(-5e4, d)).toBeCloseTo(-magnetizacion(5e4, d), 6);
  });

  it("sin núcleo M = 0 y el campo en el sensor es mucho menor", () => {
    const aire = derivados({ ...p, nucleo: "aire" });
    expect(campoSensor(1, p, aire).M).toBe(0);
    expect(campoSensor(1, p, d).B / campoSensor(1, p, aire).B).toBeGreaterThan(50);
  });

  it("la orientación del sensor invierte el campo", () => {
    expect(campoSensor(0.7, { ...p, orientacion: -1 }, d).B).toBeCloseTo(-campoSensor(0.7, p, d).B, 12);
  });
});

describe("circuito PWM", () => {
  it("con PWM 0 no hay corriente y con 255 llega a I_on sin rizado", () => {
    expect(regimenPWM(0, p, d).I_max).toBe(0);
    const lleno = regimenPWM(255, p, d);
    expect(lleno.I_min).toBeCloseTo(d.I_on, 6);
    expect(lleno.I_max).toBeCloseTo(d.I_on, 6);
  });

  it("con diodo la corriente nunca es negativa y sigue circulando en el apagado", () => {
    for (const valor of [26, 77, 128, 204]) {
      const reg = regimenPWM(valor, p, d);
      reg.periodo.i.forEach((i) => expect(i).toBeGreaterThanOrEqual(0));
      expect(reg.I_prom).toBeGreaterThan((valor / 255) * d.I_on);
      expect(reg.vCE_max).toBeCloseTo(p.V_fuente + p.V_f, 10);
    }
  });

  it("en régimen el voltaje medio sobre la bobina es cero (balance de L·di/dt)", () => {
    const valor = 128;
    const reg = regimenPWM(valor, p, d);
    const { i } = reg.periodo;
    const encendidos = 2 * valor;
    let integral = 0;
    for (let k = 0; k < TICS_PERIODO; k++) {
      const im = 0.5 * (i[k] + i[k + 1]);
      integral += k < encendidos ? p.V_fuente - p.V_CE_sat - d.R_on * im : im > 0 ? -(d.R_bob * im + p.V_f) : 0;
    }
    const escala = p.V_fuente * TICS_PERIODO;
    expect(Math.abs(integral) / escala).toBeLessThan(1e-4);
  });

  it("sin diodo el colector sube hasta V_CEO y no hay corriente por el diodo", () => {
    const sim = simular({ con_diodo: false });
    expect(sim.eventos.vCE_max).toBe(p.V_CEO);
    expect(sim.eventos.picoSinDiodo).toBe(true);
    sim.pasos.forEach((s) => s.periodo.iDiodo.forEach((x) => expect(x).toBe(0)));
  });

  it("la corriente queda limitada por beta·I_B", () => {
    const sim = simular({ R_fuente: 0 });
    expect(sim.eventos.limitadaPorTransistor).toBe(true);
    sim.pasos.forEach((s) => expect(s.I_max).toBeLessThanOrEqual(sim.d.I_C_max + 1e-12));
  });
});

describe("barrido y sensor Hall", () => {
  const sim = simular();

  it("recorre de 0 a 100 % en pasos de 10 % con los valores de analogWrite", () => {
    expect(sim.pasos.map((s) => s.D)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(sim.pasos.map((s) => s.valor)).toEqual([0, 26, 51, 77, 102, 128, 153, 179, 204, 230, 255]);
  });

  it("con PWM 0 el sensor lee su voltaje de reposo (~2.5 V, código ~512)", () => {
    expect(sim.pasos[0].V_hall_prom).toBe(p.V_q);
    expect(Math.abs(sim.pasos[0].codigo_prom - 512)).toBeLessThan(1);
  });

  it("V_hall siempre queda dentro de los límites del SS49E", () => {
    for (const c of [{}, SATURACION_SENSOR, { orientacion: -1, ...SATURACION_SENSOR }]) {
      simular(c).pasos.forEach((s) => s.periodo.V_hall.forEach((V) => {
        expect(V).toBeGreaterThanOrEqual(p.V_sat_min);
        expect(V).toBeLessThanOrEqual(p.V_sat_max);
      }));
    }
  });

  it("B y V_hall crecen con el ciclo de trabajo", () => {
    for (let j = 1; j < sim.pasos.length; j++) {
      expect(sim.pasos[j].B_prom).toBeGreaterThan(sim.pasos[j - 1].B_prom);
    }
  });

  it("la serie temporal mantiene cada paso durante duracionPaso", () => {
    expect(sim.r.D[indice(sim, 0.5)]).toBe(0);
    expect(sim.r.D[indice(sim, 5.5)]).toBe(50);
    expect(sim.r.D[indice(sim, 1e9)]).toBe(100);
    expect(sim.r.B_s[indice(sim, 3.2)]).toBe(sim.pasos[3].B_prom);
  });

  it("es determinista y rápido", () => {
    const inicio = performance.now();
    const otra = simular();
    expect(performance.now() - inicio).toBeLessThan(200);
    expect(otra.pasos.map((s) => s.codigo_prom)).toEqual(sim.pasos.map((s) => s.codigo_prom));
  });
});

describe("linealidad y causa de la saturación (pregunta 4)", () => {
  it("por defecto la curva se curva por el circuito (diodo y fuente), no por el núcleo ni el sensor", () => {
    const e = simular().eventos;
    expect(e.linealidad.saturado).toBe(true);
    expect(e.causa).toBe("circuito");
    expect(e.sensorSaturado).toBe(false);
    expect(e.nucleoSaturado).toBe(false);
  });

  it("sin diodo la relación B contra D es casi lineal", () => {
    expect(simular({ con_diodo: false }).eventos.regresion.r2).toBeGreaterThan(0.98);
  });

  it("detecta la saturación del sensor", () => {
    const e = simular(SATURACION_SENSOR).eventos;
    expect(e.sensorSaturado).toBe(true);
    expect(e.causa).toBe("sensor");
  });

  it("detecta la saturación del núcleo", () => {
    const e = simular(SATURACION_NUCLEO).eventos;
    expect(e.M_Ms_max).toBeGreaterThan(0.5);
    expect(e.causa).toBe("nucleo");
  });
});
