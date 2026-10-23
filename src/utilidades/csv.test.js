import { describe, it, expect } from "vitest";
import { leerTabla, leerMedicionHito1, leerMedicionHito2, normalizarEncabezado, escribirCSV, numeroCSV } from "./csv.js";
import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";

describe("tabla genérica", () => {
  it("normaliza nombres y unidades del encabezado", () => {
    expect(normalizarEncabezado(" CicloTrabajo_PWM ")).toEqual({ nombre: "ciclotrabajo_pwm", unidad: null });
    expect(normalizarEncabezado("Tensión [V]")).toEqual({ nombre: "tension", unidad: "v" });
    expect(normalizarEncabezado("﻿Tiempo (us)")).toEqual({ nombre: "tiempo", unidad: "us" });
  });

  it("salta START/STOP y el texto antes del encabezado; acepta ; y tabulador con coma decimal", () => {
    const coma = leerTabla("Esperando...\nSTART\nTiempo,Voltaje\n0,2.5\n2,2.6\nSTOP\n");
    expect(coma.ok).toBe(true);
    expect(coma.filas).toEqual([[0, 2.5], [2, 2.6]]);
    expect(leerTabla("Tiempo;Voltaje\r\n0;2,5\r\n2;2,6").filas).toEqual([[0, 2.5], [2, 2.6]]);
    expect(leerTabla("CicloTrabajo_PWM\tVoltaje_Hall\n0\t2,51\n128\t3,02").filas).toEqual([[0, 2.51], [128, 3.02]]);
  });

  it("errores con fila y columna", () => {
    expect(leerTabla("").errores[0]).toMatch(/vacío/);
    expect(leerTabla("0,1\n2,3").errores[0]).toMatch(/encabezado/);
    const r = leerTabla("Tiempo,Voltaje\n0,2.5\n2,abc\n4,2.4");
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toBe('Fila 3, columna "Voltaje": valor no numérico ("abc").');
  });
});

describe("Hito 1: Tiempo,Voltaje", () => {
  it("tiempo en ms desde la primera muestra y voltaje en V", () => {
    const r = leerMedicionHito1("Tiempo,Voltaje\n1000,2.50\n1002,2.75\n1004,2.30");
    expect(r.ok).toBe(true);
    expect(Array.from(r.t)).toEqual([0, 0.002, 0.004]);
    expect(Array.from(r.V)).toEqual([2.5, 2.75, 2.3]);
    expect(r.esCodigo).toBe(false);
    expect(r.unidadTiempo).toBe("ms");
  });

  it("detecta código ADC, micros() y columnas en otro orden", () => {
    const r = leerMedicionHito1("lectura,micros\n512,0\n600,2000\n480,4000");
    expect(r.ok).toBe(true);
    expect(r.esCodigo).toBe(true);
    expect(r.V[0]).toBeCloseTo(2.5, 12);
    expect(r.t[2]).toBeCloseTo(0.004, 12);
    const u = leerMedicionHito1("Tiempo,Voltaje\n0,2.5\n2000,2.6\n4000,2.4");
    expect(u.unidadTiempo).toBe("us");
    expect(u.avisos.length).toBe(1);
  });

  it("tiempo no creciente y columnas faltantes", () => {
    expect(leerMedicionHito1("Tiempo,Voltaje\n0,2.5\n0,2.6").errores[0]).toMatch(/creciente: fila 3/);
    expect(leerMedicionHito1("Tiempo,Corriente,Otra\n0,1,2\n2,1,2").errores[0]).toMatch(/Falta la columna de voltaje/);
    // Con dos columnas sin nombre conocido se usan en orden, con aviso
    const r = leerMedicionHito1("a,b\n0,2.5\n2,2.6");
    expect(r.ok).toBe(true);
    expect(r.avisos[0]).toMatch(/primera columna/);
  });
});

describe("Hito 2: CicloTrabajo_PWM,Voltaje_Hall", () => {
  it("ciclo de 0 a 255 y promedio de varias lecturas por ciclo", () => {
    const r = leerMedicionHito2("CicloTrabajo_PWM,Voltaje_Hall\n0,2.50\n0,2.52\n255,3.40\n128,3.00");
    expect(r.ok).toBe(true);
    expect(r.cicloEn255).toBe(true);
    expect(Array.from(r.D)).toEqual([0, 50.2, 100]);
    expect(r.V[0]).toBeCloseTo(2.51, 12);
    expect(Array.from(r.lecturas)).toEqual([2, 1, 1]);
  });

  it("ciclo en % o con la unidad en el encabezado", () => {
    const p = leerMedicionHito2("D [%],V_hall\n0,2.5\n50,2.9\n100,3.3");
    expect(p.cicloEn255).toBe(false);
    expect(p.avisos).toEqual([]);
    expect(Array.from(p.D)).toEqual([0, 50, 100]);
    const s = leerMedicionHito2("CicloTrabajo_PWM [0-255],Voltaje_Hall\n0,2.5\n51,2.9");
    expect(Array.from(s.D)).toEqual([0, 20]);
    expect(leerMedicionHito2("CicloTrabajo_PWM,Voltaje_Hall\n0,2.5\n50,2.9").avisos[0]).toMatch(/se leyó en %/);
  });

  it("código ADC en A1 y ciclo fuera de rango", () => {
    const r = leerMedicionHito2("CicloTrabajo_PWM,Voltaje_Hall\n0,512\n255,700");
    expect(r.esCodigo).toBe(true);
    expect(r.V[0]).toBeCloseTo(2.5, 12);
    expect(leerMedicionHito2("D [%],V\n0,2.5\n120,2.9").errores[0]).toMatch(/fuera de rango/);
  });
});

describe("CSV del gemelo", () => {
  it("encabezados y una fila por muestra; B_s en mT", () => {
    const s1 = simular1();
    const t1 = escribirCSV(1, s1).split("\n");
    expect(t1[0]).toBe("t [s],x [m],v [m/s],Phi [Wb],emf [V],V_A0 [V],codigo [-],codigo_filtrado [-]");
    expect(t1.length).toBe(s1.Nt + 1);
    const s2 = simular2();
    const t2 = escribirCSV(2, s2).split("\n");
    expect(t2[0]).toBe("t [s],D [%],I_prom [A],M [A/m],B_s [mT],V_hall [V],codigo [-]");
    const k = s2.Nt - 1;
    expect(Number(t2[k + 1].split(",")[4])).toBeCloseTo(s2.r.B_s[k] * 1e3, 6);
  });

  it("números con 10 cifras sin ceros sobrantes", () => {
    expect(numeroCSV(0.1 + 0.2)).toBe("0.3");
    expect(numeroCSV(2.5)).toBe("2.5");
    expect(numeroCSV(-1.234567890123e-7)).toBe("-1.23456789e-7");
  });
});
