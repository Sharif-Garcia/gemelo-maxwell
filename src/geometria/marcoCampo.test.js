import { describe, it, expect } from "vitest";
import { crearMarco, marcoHito1, marcoHito2, puntosSondaHito1, puntosSondaHito2 } from "./marcoCampo.js";
import { colocacionPerno, SENSOR, EJE_PERNO } from "./montajeHito2.js";
import { CENTRO_BOBINA_1, ALTO_TAPETE } from "./mesa.js";
import { aEscena } from "./unidades.js";
import { geometriaBobina } from "../fisica/bobina.js";
import { PARAMETROS_BASE as BASE_2, simular as simular2 } from "../fisica/ampere.js";
import { PARAMETROS_BASE as BASE_1, simular as simular1 } from "../fisica/faraday.js";
import { configuracionLineas, factorIntensidad, instantePWM, laminasHito1, pasoReferencia } from "../fisica/campoHitos.js";
import { crearCampo } from "../fisica/lineasCampo.js";
import { campoSensor } from "../fisica/ampere.js";

describe("marco del campo", () => {
  const marco = crearMarco([1, 2, 3], [0, -1, 0], [1, 0, 0]);

  it("ida y vuelta entre motor y escena", () => {
    for (const [rho, z, phi] of [[0.01, 0.02, 0], [0.005, -0.03, 1.2], [0.02, 0, Math.PI]]) {
      const p = marco.aEscena(rho, z, phi);
      const m = marco.aMotor(p);
      expect(m.rho).toBeCloseTo(rho, 12);
      expect(m.z).toBeCloseTo(z, 12);
    }
  });

  it("Hito 1: +z del motor es hacia abajo; Hito 2: es hacia el sensor (+x)", () => {
    const h1 = marcoHito1(20);
    expect(h1.aEscena(0, 0.01)[1]).toBeCloseTo(19, 12);
    const perno = colocacionPerno(BASE_2);
    const h2 = marcoHito2(perno);
    expect(h2.aEscena(0, 0.01)[0]).toBeCloseTo(perno.xCentro + 1, 12);
    expect(h2.aEscena(0.01, 0, 0)[1]).toBeGreaterThan(h2.origen[1]);   // el plano de corte es vertical
  });

  it("el vector de campo se arma con el eje y la dirección radial", () => {
    const m = marco.aMotor(marco.aEscena(0.01, 0, 0));
    expect(marco.vectorEscena(0, 1, m.radial)).toEqual([0, -1, 0]);
    expect(marco.vectorEscena(1, 0, m.radial)[0]).toBeCloseTo(1, 12);
  });
});

describe("puntos de sonda", () => {
  it("Hito 1: a ambos lados del tubo, fuera de la bobina y sobre el tapete", () => {
    const puntos = puntosSondaHito1();
    const rExt = aEscena(geometriaBobina(BASE_1).r_ext);
    expect(puntos.length).toBeGreaterThan(100);
    for (const [x, y, z] of puntos) {
      expect(Math.abs(x - CENTRO_BOBINA_1[0])).toBeGreaterThan(rExt);
      expect(z).toBeCloseTo(CENTRO_BOBINA_1[2], 12);
      expect(y).toBeGreaterThan(ALTO_TAPETE);
    }
    expect(puntos.some(([x]) => x < CENTRO_BOBINA_1[0])).toBe(true);
    expect(puntos.some(([x]) => x > CENTRO_BOBINA_1[0])).toBe(true);
  });

  it("Hito 2: fuera de la bobina, antes del sensor y sobre el tapete", () => {
    for (const p of [BASE_2, { ...BASE_2, d_sensor: 1e-3 }, { ...BASE_2, N: 600, capas: 10, d_nuc: 12e-3 }]) {
      const perno = colocacionPerno(p);
      const b = geometriaBobina({ N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.d_nuc / 2 });
      for (const [x, y] of puntosSondaHito2(p, perno, b.r_ext)) {
        expect(Math.abs(y - EJE_PERNO.y)).toBeGreaterThan(aEscena(b.r_ext));
        expect(x).toBeLessThan(SENSOR.xCara);
        expect(y).toBeGreaterThan(ALTO_TAPETE);
      }
    }
  });
});

describe("configuración del campo por hito", () => {
  it("Hito 1: el imán es una lámina con K = Br/mu0 y su forma no depende de la simulación", () => {
    const sim = simular1();
    const c = configuracionLineas(1, sim, 7);
    expect(c.laminas).toEqual(laminasHito1(sim.p));
    expect(configuracionLineas(1, simular1({ v: 3, tipoMovimiento: "constante" }), 7).clave).toBe(c.clave);
    expect(factorIntensidad(1, sim, 100, c.referencia)).toBe(1);
    expect(BASE_1.d_im / 2).toBe(c.laminas[0].a);
  });

  it("Hito 2: las láminas de referencia reproducen el campo del sensor de ese paso", () => {
    const sim = simular2();
    const c = configuracionLineas(2, sim, 9);
    const ref = pasoReferencia(sim);
    const campo = crearCampo(c.laminas);
    const esperado = campoSensor(ref.I_prom, sim.p, sim.d).B;
    expect(campo(0, sim.d.z_sensor).Bz).toBeCloseTo(esperado, 9);
  });

  it("Hito 2: el factor de intensidad va de 0 (sin PWM) a 1 (paso de referencia)", () => {
    const sim = simular2();
    const c = configuracionLineas(2, sim, 9);
    expect(factorIntensidad(2, sim, 0, c.referencia)).toBe(0);
    expect(factorIntensidad(2, sim, sim.Nt - 1, c.referencia)).toBeCloseTo(1, 9);
  });

  it("Hito 2: la cámara lenta del PWM lee el periodo del paso actual", () => {
    const sim = simular2();
    const paso = sim.pasos[5];
    expect(instantePWM(sim, 5.5, 0).I).toBe(paso.periodo.i[0]);
    expect(instantePWM(sim, 5.5, sim.d.T_PWM / 2).B).toBe(paso.periodo.B[255]);
    expect(instantePWM(sim, 5.5, sim.d.T_PWM).M).toBe(paso.periodo.M[510]);
  });

  it("Hito 2: la clave solo cambia si cambia la forma de las líneas", () => {
    const a = configuracionLineas(2, simular2(), 9).clave;
    expect(configuracionLineas(2, simular2({ sigma_ruido: 2 }), 9).clave).toBe(a);
    expect(configuracionLineas(2, simular2({ d_sensor: 5e-3 }), 9).clave).toBe(a);
    expect(configuracionLineas(2, simular2({ nucleo: "aire" }), 9).clave).not.toBe(a);
  });
});
