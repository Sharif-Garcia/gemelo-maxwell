/* Pruebas del encuadre de las vistas de cámara de ambos hitos. */
import { describe, test, expect } from "vitest";
import { VISTAS, cajaVista, baseCamara, encuadreVista, DISTANCIA_MIN } from "./vistas.js";
import { ZONAS, TAPETE, ALTO_TAPETE } from "../../../geometria/mesa.js";

const FOV = (40 * Math.PI) / 180;
const ASPECTOS = [1366 / 330, 1366 / 650, 1920 / 640, 1920 / 1000, 0.6];

// Proyección de las 8 esquinas: la mayor fracción del medio cuadro ocupada
function ocupacion(caja, posicion, direccion, aspecto) {
  const { f, r, u } = baseCamara(direccion);
  const tanV = Math.tan(FOV / 2);
  const tanH = tanV * aspecto;
  let maximo = 0;
  for (const x of [caja.min[0], caja.max[0]]) {
    for (const y of [caja.min[1], caja.max[1]]) {
      for (const z of [caja.min[2], caja.max[2]]) {
        const q = [x - posicion[0], y - posicion[1], z - posicion[2]];
        const prof = -(q[0] * f[0] + q[1] * f[1] + q[2] * f[2]);
        const h = Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2]) / prof / tanH;
        const v = Math.abs(q[0] * u[0] + q[1] * u[1] + q[2] * u[2]) / prof / tanV;
        maximo = Math.max(maximo, h, v);
      }
    }
  }
  return maximo;
}

describe.each([1, 2])("hito %i", (hito) => {
  test.each(VISTAS[hito].map((v) => [v.nombre, v]))("%s encuadra su caja en cualquier proporción", (_, vista) => {
    // Alturas del imán: arriba en el tubo, en la bobina y apoyado en el tope
    for (const yIman of [34, 20.3, 2.3]) {
      for (const aspecto of ASPECTOS) {
        const { posicion, objetivo } = encuadreVista(hito, vista.id, FOV, aspecto, yIman);
        const caja = cajaVista(hito, vista, yIman);
        const ocupa = ocupacion(caja, posicion, vista.direccion, aspecto);
        expect(ocupa).toBeLessThanOrEqual(1 + 1e-9);   // todo dentro del cuadro
        // Ajustado, salvo cuando manda la distancia mínima de los controles
        const distancia = Math.hypot(...posicion.map((v, i) => v - objetivo[i]));
        if (distancia > DISTANCIA_MIN + 1e-9) expect(ocupa).toBeGreaterThan(0.85);
        // La cámara nunca queda bajo el tapete
        expect(posicion[1]).toBeGreaterThan(ALTO_TAPETE);
      }
    }
  });

  test("las zonas están sobre el tapete y dentro de él", () => {
    for (const zona of Object.values(ZONAS[hito])) {
      for (let i = 0; i < 3; i++) expect(zona.min[i]).toBeLessThan(zona.max[i]);
      expect(zona.min[1]).toBeGreaterThanOrEqual(ALTO_TAPETE);
      expect(Math.abs(zona.min[0])).toBeLessThanOrEqual(TAPETE.ancho / 2);
      expect(Math.abs(zona.max[0])).toBeLessThanOrEqual(TAPETE.ancho / 2);
      expect(Math.abs(zona.min[2])).toBeLessThanOrEqual(TAPETE.fondo / 2);
      expect(Math.abs(zona.max[2])).toBeLessThanOrEqual(TAPETE.fondo / 2);
    }
  });
});

test("Seguir imán centra el imán a cualquier altura", () => {
  for (const yIman of [34, 20.3, 2.3]) {
    const { objetivo } = encuadreVista(1, "iman", FOV, 2, yIman);
    expect(objetivo[1]).toBeCloseTo(yIman, 9);
  }
});

test("en una ventana angosta la cámara se aleja para que quepa el ancho", () => {
  const distancia = (aspecto) => {
    const { posicion, objetivo } = encuadreVista(2, "general", FOV, aspecto);
    return Math.hypot(...posicion.map((v, i) => v - objetivo[i]));
  };
  expect(distancia(0.6)).toBeGreaterThan(distancia(1366 / 650) * 1.2);
});
