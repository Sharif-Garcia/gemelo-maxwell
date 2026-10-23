import { describe, it, expect } from "vitest";
import { avisosHito } from "./avisos.js";
import { parametrosDeEscenario } from "./escenarios.js";
import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";

const ids = (hito, sim, error) => avisosHito(hito, sim, error).map((a) => a.id);

describe("avisos", () => {
  it("los escenarios por defecto no tienen avisos", () => {
    expect(ids(1, simular1())).toEqual([]);
    expect(ids(2, simular2())).toEqual([]);
  });

  it("Hito 1: el ADC recortado se avisa con la cantidad de muestras", () => {
    const sim = simular1(parametrosDeEscenario(1, "saturacion-adc"));
    const [aviso] = avisosHito(1, sim);
    expect(aviso.id).toBe("adc");
    expect(aviso.texto).toContain(String(sim.eventos.saturadas));
  });

  it("Hito 2: sin diodo es un peligro", () => {
    const [aviso] = avisosHito(2, simular2(parametrosDeEscenario(2, "sin-diodo")));
    expect(aviso).toMatchObject({ id: "diodo", nivel: "peligro" });
    expect(aviso.texto).toContain("60 V");
  });

  it("Hito 2: cada escenario de saturación avisa su causa", () => {
    expect(ids(2, simular2(parametrosDeEscenario(2, "saturacion-sensor")))).toContain("sensor");
    expect(ids(2, simular2(parametrosDeEscenario(2, "saturacion-nucleo")))).toContain("nucleo");
  });

  it("Hito 2: avisa si la corriente la limita el transistor o supera al adaptador", () => {
    expect(ids(2, simular2({ R_fuente: 0 }))).toContain("transistor");
    expect(ids(2, simular2({ R_fuente: 5 }))).toContain("fuente");
  });

  it("el error de simulación es un peligro", () => {
    expect(avisosHito(1, simular1(), "imán inválido")[0]).toMatchObject({ id: "error", nivel: "peligro" });
  });
});
