import { describe, it, expect } from "vitest";
import {
  VARIABLES, PESTANAS, TIEMPO, seriesDerivadas, datosGrafica, etiquetaEje, marcasEventos, tiempoEIndice,
  finEje, acotarRango, zoomRueda, esRangoCompleto, filasEtiquetas, curvaVelocidades, datosDispersion,
  datosPeriodo, pasoEnTiempo, VELOCIDADES_ENSAYO, MEDIDAS, clavesConMedicion, COLOR_MEDICION,
} from "./series.js";
import { leerMedicion } from "../utilidades/csv.js";
import { ejemplo } from "../utilidades/ejemplos.js";
import { simular as simular1, PARAMETROS_BASE as BASE_1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";

const sim1 = simular1();
const sim2 = simular2();
const SIMS = { 1: sim1, 2: sim2 };

describe("pestañas y variables", () => {
  it.each([1, 2])("hito %i: cada gráfica usa variables definidas con una sola unidad", (hito) => {
    for (const p of PESTANAS[hito].filter((x) => x.tipo === "tiempo")) {
      for (const claves of p.graficas) {
        for (const c of claves) expect(VARIABLES[hito][c], `${p.id}:${c}`).toBeDefined();
        expect(new Set(claves.map((c) => VARIABLES[hito][c].unidad)).size).toBe(1);
      }
    }
  });

  it.each([1, 2])("hito %i: las gráficas compartidas usan colores distintos", (hito) => {
    for (const p of PESTANAS[hito].filter((x) => x.tipo === "tiempo")) {
      for (const claves of p.graficas) {
        const colores = claves.map((c) => VARIABLES[hito][c].color);
        expect(new Set(colores).size).toBe(colores.length);
      }
    }
  });

  it.each([1, 2])("hito %i: todas las series están alineadas con el tiempo", (hito) => {
    const s = seriesDerivadas(hito, SIMS[hito]);
    const medidas = new Set(Object.values(MEDIDAS[hito]));
    for (const c of Object.keys(VARIABLES[hito]).filter((x) => !medidas.has(x))) expect(s[c].length, c).toBe(SIMS[hito].Nt);
    expect(s.t.length).toBe(SIMS[hito].Nt);
  });

  it.each([1, 2])("hito %i: la medición se superpone punteada, con su unidad y alineada", (hito) => {
    const medicion = { nombre: "ejemplo", datos: leerMedicion(hito, ejemplo(hito)), ajuste: null };
    for (const [gemelo, medida] of Object.entries(MEDIDAS[hito])) {
      expect(VARIABLES[hito][medida].unidad, medida).toBe(VARIABLES[hito][gemelo].unidad);
      expect(VARIABLES[hito][medida].color).toBe(COLOR_MEDICION);
      expect(VARIABLES[hito][medida].trazo).toBeDefined();
    }
    const clave = hito === 1 ? "emf" : "V_hall";
    const claves = clavesConMedicion(hito, [clave], true);
    expect(claves).toEqual([clave, MEDIDAS[hito][clave]]);
    expect(clavesConMedicion(hito, [clave], false)).toEqual([clave]);
    const datos = datosGrafica(hito, SIMS[hito], claves, medicion);
    expect(datos[2].length).toBe(SIMS[hito].Nt);
    expect(datos[2].some(Number.isFinite)).toBe(true);
    // La misma medición con la misma simulación no se vuelve a alinear
    expect(datosGrafica(hito, SIMS[hito], claves, medicion)[2]).toBe(datos[2]);
  });

  it("las series se calculan una sola vez por simulación", () => {
    expect(seriesDerivadas(1, sim1)).toBe(seriesDerivadas(1, sim1));
    expect(datosGrafica(1, sim1, ["emf"])[1]).toBe(sim1.r.emf);
  });

  it("etiqueta del eje con símbolos y unidad", () => {
    expect(etiquetaEje(1, ["emf", "emfMedida"])).toBe("ε, ε_med [V]");
    expect(etiquetaEje(2, ["codigo"])).toBe("A1");
  });
});

describe("series derivadas del Hito 1", () => {
  const s = seriesDerivadas(1, sim1);

  it("el tiempo va en ms y la posición en mm", () => {
    expect(s.t[10]).toBeCloseTo(sim1.r.t[10] * 1e3, 12);
    expect(s.x[0]).toBeCloseTo(-100, 9);
  });

  it("la integral acumulada termina en la integral del motor (en mV·s)", () => {
    expect(s.integral.at(-1)).toBeCloseTo(sim1.eventos.integral * 1e3, 9);
  });

  it("el filtro N = 1 es la lectura cruda y el de N = 5 coincide con el del motor", () => {
    const lsb = BASE_1.V_cc / 1024;
    expect(s.filtro1[2000]).toBeCloseTo((sim1.r.codigo[2000] + 0.5) * lsb - BASE_1.V_ref, 12);
    for (let k = 0; k < sim1.Nt; k += 97) expect(s.filtro5[k]).toBeCloseTo(s.emfMedida[k], 12);
  });

  it("un filtro más largo atenúa más el pico", () => {
    const pico = (serie) => Math.max(...serie);
    expect(pico(s.filtro1)).toBeGreaterThan(pico(s.filtro5));
    expect(pico(s.filtro5)).toBeGreaterThan(pico(s.filtro10));
  });

  it("marca la entrada, el centro y la salida en orden", () => {
    const marcas = marcasEventos(1, sim1);
    expect(marcas.map((m) => m.etiqueta)).toEqual(["entrada", "centro", "salida"]);
    expect(marcas[0].t).toBeCloseTo(sim1.eventos.picoPositivo.t * 1e3, 9);
  });
});

describe("tiempo y zoom", () => {
  it("convierte el tiempo del eje al de la simulación en cada hito", () => {
    expect(tiempoEIndice(1, sim1, 100).t).toBeCloseTo(0.1, 12);
    expect(tiempoEIndice(2, sim2, 3.5).t).toBeCloseTo(3.5, 12);
    expect(tiempoEIndice(1, sim1, 1e9).indice).toBe(sim1.Nt - 1);
    expect(finEje(1, sim1)).toBeCloseTo(sim1.r.t.at(-1) * 1e3, 9);
  });

  it("el zoom respeta el ancho mínimo y no sale del rango", () => {
    expect(acotarRango(5, 5.1, 232, TIEMPO[1].rangoMinimo)).toEqual({ min: 5, max: 5.5 });
    expect(acotarRango(-3, 10, 232, 0.5)).toEqual({ min: 0, max: 13 });
    const z = zoomRueda({ min: 0, max: 232 }, 116, 0.5, 232, 0.5);
    expect(z.max - z.min).toBeCloseTo(116, 9);
    expect(esRangoCompleto({ min: 0, max: 232 }, 232)).toBe(true);
  });

  it("las etiquetas encimadas bajan a otra fila", () => {
    expect(filasEtiquetas([{ x: 0, ancho: 40 }, { x: 10, ancho: 40 }, { x: 100, ancho: 10 }], 4)).toEqual([0, 1, 0]);
  });
});

describe("gráficas XY", () => {
  it("pregunta 2: el pico crece proporcional a v y Δt cae como 1/v", () => {
    const c = curvaVelocidades(BASE_1);
    expect(c.v.length).toBe(VELOCIDADES_ENSAYO.length);
    const i1 = VELOCIDADES_ENSAYO.indexOf(1);
    const i2 = VELOCIDADES_ENSAYO.indexOf(2);
    expect(c.pico[i2] / c.pico[i1]).toBeCloseTo(2, 2);
    expect(c.deltaT[i1] / c.deltaT[i2]).toBeCloseTo(2, 1);
  });

  it("pregunta 4: la recta de regresión pasa por los datos y reporta R² y la causa", () => {
    const d = datosDispersion(sim2);
    expect(d.D.length).toBe(sim2.pasos.length);
    const { pendiente, ordenada } = sim2.eventos.regresion;
    expect(d.recta[5]).toBeCloseTo((ordenada + pendiente * 50) * 1e3, 9);
    expect(d.r2).toBeCloseTo(sim2.eventos.regresion.r2, 12);
    expect(d.causa).toBe("circuito");
  });

  it("el periodo PWM corresponde al paso del instante", () => {
    expect(pasoEnTiempo(sim2, 0.2)).toBe(0);
    expect(pasoEnTiempo(sim2, 5.5)).toBe(5);
    expect(pasoEnTiempo(sim2, 1e9)).toBe(sim2.pasos.length - 1);
    const p = datosPeriodo(sim2, 5.5);
    expect(p.D).toBe(50);
    expect(p.t.at(-1)).toBeCloseTo(sim2.d.T_PWM * 1e3, 9);
    expect(p.i.length).toBe(p.t.length);
  });
});
