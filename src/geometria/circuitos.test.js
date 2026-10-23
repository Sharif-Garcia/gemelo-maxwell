import { describe, it, expect } from "vitest";
import { CIRCUITOS, CORRIENTES_HITO_2, verificarCircuito } from "./circuitos.js";
import { MONTAJES, posicionUbicacion } from "./montaje.js";
import { ZONAS } from "./mesa.js";
import { MIL, pinMil, HEADERS, contornoLocal } from "./arduino.js";
import { PB, PASO, agujeroLocal, tira, todosLosAgujeros, rielCercano, existeAgujero } from "./protoboard.js";
import { aplicarColocacion } from "./transformar.js";

const copiar = (c) => JSON.parse(JSON.stringify(c));
const dentro = (p, caja, holgura = 1e-9) => p.every((v, i) => v >= caja.min[i] - holgura && v <= caja.max[i] + holgura);

describe("Arduino Uno", () => {
  it("tiene los 32 pines de los headers y el hueco de 160 mil entre D7 y D8", () => {
    expect(HEADERS.reduce((s, h) => s + h.pines.length, 0)).toBe(32);
    expect(pinMil("D7")[0] - pinMil("D8")[0]).toBe(160);
    expect(pinMil("D0")[0] - pinMil("D7")[0]).toBe(700);
    expect(pinMil("A0")[0] - pinMil("VIN")[0]).toBe(300);
    expect(pinMil("5V")[1]).toBe(100);
    expect(pinMil("D9")[1]).toBe(2000);
  });

  it("en el Hito 2 está girado: USB a la derecha y header digital hacia el frente", () => {
    const usb = aplicarColocacion([-0.5, 0, -1490 * MIL], MONTAJES[2].arduino);
    const d9 = posicionUbicacion(2, "arduino:D9");
    const a1 = posicionUbicacion(2, "arduino:A1");
    expect(usb[0]).toBeGreaterThan(d9[0]);
    expect(d9[2]).toBeGreaterThan(a1[2]);
    // En el Hito 1 es al revés
    expect(posicionUbicacion(1, "arduino:D9")[2]).toBeLessThan(posicionUbicacion(1, "arduino:A0")[2]);
  });
});

describe("protoboard de 830 puntos", () => {
  it("tiene 630 agujeros de trabajo y 200 de riel", () => {
    const ids = todosLosAgujeros();
    expect(ids).toHaveLength(830);
    expect(new Set(ids).size).toBe(830);
    expect(ids.filter((id) => id.startsWith("sup") || id.startsWith("inf"))).toHaveLength(200);
  });

  it("paso de 2.54 mm, canal de 7.62 mm y todo dentro del cuerpo", () => {
    expect(agujeroLocal("a2")[0] - agujeroLocal("a1")[0]).toBeCloseTo(PASO, 12);
    expect(agujeroLocal("e1")[2] - agujeroLocal("f1")[2]).toBeCloseTo(3 * PASO, 12);
    expect(agujeroLocal("a1")[2]).toBeGreaterThan(0);   // la fila a queda al frente
    for (const id of todosLosAgujeros()) {
      const [x, , z] = agujeroLocal(id);
      expect(Math.abs(x)).toBeLessThan(PB.ancho / 2);
      expect(Math.abs(z)).toBeLessThan(PB.fondo / 2);
    }
  });

  it("las tiras conducen como en una protoboard real", () => {
    expect(tira("a5")).toBe(tira("e5"));
    expect(tira("e5")).not.toBe(tira("f5"));
    expect(tira("f5")).toBe(tira("j5"));
    expect(tira("a5")).not.toBe(tira("a6"));
    expect(tira("inf+0")).toBe(tira("inf+49"));
    expect(tira("inf+0")).not.toBe(tira("inf-0"));
  });

  it("rechaza agujeros inexistentes y encuentra el riel más cercano", () => {
    for (const id of ["k1", "a0", "a64", "inf+50", "med+1"]) expect(existeAgujero(id)).toBe(false);
    const riel = rielCercano("inf+", 10);
    expect(Math.abs(agujeroLocal(riel)[0] - agujeroLocal("a10")[0])).toBeLessThanOrEqual(PASO);
  });
});

describe.each([1, 2])("netlist del hito %i", (hito) => {
  const circuito = CIRCUITOS[hito];

  it("es fiel al circuito de la guía: todas las redes unidas, sin cortos ni agujeros repetidos", () => {
    expect(verificarCircuito(circuito)).toEqual([]);
  });

  it("detecta un cable que falta (red abierta)", () => {
    const c = copiar(circuito);
    c.cables.pop();
    expect(verificarCircuito(c).some((e) => e.includes("abierta"))).toBe(true);
  });

  it("detecta un corto entre dos redes", () => {
    const c = copiar(circuito);
    // Hito 1: un cable de la columna de 5 V (R1) a la de GND (R2); Hito 2: del riel de 12 V al de 5 V
    const corto = hito === 1
      ? { id: "corto", color: "rojo", desde: "pb:e6", hasta: "pb:e14" }
      : { id: "corto", color: "rojo", desde: "pb:inf+40", hasta: "pb:sup+40" };
    c.cables.push(corto);
    const esperado = hito === 1 ? /Corto entre (5V y GND|GND y 5V)/ : /Corto entre (\+12V y 5V|5V y \+12V)/;
    expect(verificarCircuito(c).some((e) => esperado.test(e))).toBe(true);
  });

  it("detecta dos patas en el mismo agujero", () => {
    const c = copiar(circuito);
    const resistencia = c.componentes.find((x) => x.tipo === "resistencia");
    const otro = c.componentes.find((x) => x !== resistencia && Object.values(x.terminales).some((u) => u.startsWith("pb:")));
    const ocupado = otro ? Object.values(otro.terminales).find((u) => u.startsWith("pb:")) : c.cables.find((x) => x.hasta.startsWith("pb:")).hasta;
    resistencia.terminales[1] = ocupado;
    expect(verificarCircuito(c).some((e) => e.includes("más de una"))).toBe(true);
  });

  it("cada ubicación queda dentro de la zona de su pieza", () => {
    const usadas = new Set([
      ...circuito.componentes.flatMap((c) => Object.values(c.terminales)),
      ...circuito.cables.flatMap((c) => [c.desde, c.hasta]),
    ]);
    const todas = Object.values(ZONAS[hito]);
    for (const u of usadas) {
      const p = posicionUbicacion(hito, u);
      const zona = u.startsWith("arduino:") ? ZONAS[hito].arduino : u.startsWith("pb:") ? ZONAS[hito].protoboard : null;
      if (zona) expect(dentro(p, zona), u).toBe(true);
      else expect(todas.some((z) => dentro(p, z)), u).toBe(true);
    }
  });

  it("el Arduino y la protoboard caben en sus zonas", () => {
    const { arduino, protoboard } = MONTAJES[hito];
    for (const p of contornoLocal()) expect(dentro(aplicarColocacion(p, arduino), ZONAS[hito].arduino)).toBe(true);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const esquina = aplicarColocacion([(x * PB.ancho) / 2, 0, (z * PB.fondo) / 2], protoboard);
      expect(dentro(esquina, ZONAS[hito].protoboard)).toBe(true);
    }
  });
});

describe("lazo de potencia del Hito 2", () => {
  const cable = (id) => CIRCUITOS[2].cables.find((c) => c.id === id);
  // Extremo por donde entra y por donde sale la corriente de cada cable
  const extremos = (id) => {
    const c = cable(id);
    return CORRIENTES_HITO_2[id].sentido > 0 ? { entra: c.desde, sale: c.hasta } : { entra: c.hasta, sale: c.desde };
  };
  const nodo = (ubicacion) => (ubicacion.startsWith("pb:") ? tira(ubicacion.slice(3)) : ubicacion);

  it("los cables existen y forman el lazo +12 V, solenoide, colector, emisor, GND y fuente", () => {
    for (const id of Object.keys(CORRIENTES_HITO_2)) expect(cable(id), id).toBeDefined();
    expect(extremos("fuente+").entra).toBe("ext:fuente+");
    expect(nodo(extremos("fuente+").sale)).toBe(nodo(extremos("solenoide12V").entra));
    expect(extremos("solenoide12V").sale).toBe("ext:solenoide1");
    expect(extremos("solenoideColector").entra).toBe("ext:solenoide2");
    const q1 = CIRCUITOS[2].componentes.find((c) => c.id === "Q1").terminales;
    expect(nodo(extremos("solenoideColector").sale)).toBe(nodo(q1.C));
    expect(nodo(extremos("emisor").entra)).toBe(nodo(q1.E));
    expect(nodo(extremos("emisor").sale)).toBe(nodo(extremos("fuente-").entra));
    expect(extremos("fuente-").sale).toBe("ext:fuente-");
  });
});
