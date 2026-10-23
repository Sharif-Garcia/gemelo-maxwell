/*
 * Marco del campo de cada hito: pasa del marco del motor (rho, z en metros, eje de simetría) a la
 * escena (cm) y al revés. Funciones puras (sin three.js).
 *
 * `origen` [cm] es el centro de la fuente, `eje` el vector unitario de la escena que corresponde
 * al +z del motor y `e1` una dirección perpendicular que define el plano phi = 0 (el plano de
 * corte del mapa de calor, las flechas y las brújulas).
 * - Hito 1: el +z del motor es la caída del imán (-y de la escena); plano de corte x-y.
 * - Hito 2: el +z del motor es +x (hacia el sensor); plano de corte vertical x-y.
 */

import { ESCALA } from "./unidades.js";
import { ALTO_TAPETE, CENTRO_BOBINA_1 } from "./mesa.js";
import { EJE_TUBO } from "./montajeHito1.js";
import { EJE_PERNO } from "./montajeHito2.js";

const sumar = (a, b) => a.map((v, i) => v + b[i]);
const escalar = (a, k) => a.map((v) => v * k);
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function crearMarco(origen, eje, e1) {
  const e2 = cruz(eje, e1);
  return {
    origen,
    eje,
    e1,
    e2,
    // Punto de escena del punto del motor (rho, z) en el plano de ángulo phi
    aEscena(rho, z, phi = 0) {
      const radial = sumar(escalar(e1, Math.cos(phi)), escalar(e2, Math.sin(phi)));
      return sumar(origen, escalar(sumar(escalar(eje, z), escalar(radial, rho)), ESCALA));
    },
    // Coordenadas del motor de un punto de escena y dirección radial (unitaria) en la escena
    aMotor(p) {
      const v = escalar(p.map((c, i) => c - origen[i]), 1 / ESCALA);
      const z = punto(v, eje);
      const radial = v.map((c, i) => c - z * eje[i]);
      const rho = Math.hypot(...radial);
      return { rho, z, radial: rho > 1e-12 ? escalar(radial, 1 / rho) : e1 };
    },
    // Vector de campo en la escena a partir de sus componentes en el motor
    vectorEscena(Brho, Bz, radial) {
      return sumar(escalar(eje, Bz), escalar(radial, Brho));
    },
  };
}

// Hito 1: el origen sigue al imán (altura de escena yIman)
export function marcoHito1(yIman = 0) {
  return crearMarco([EJE_TUBO.x, yIman, EJE_TUBO.z], [0, -1, 0], [1, 0, 0]);
}

// Hito 2: origen en el centro del núcleo (colocacionPerno)
export function marcoHito2(perno) {
  return crearMarco([perno.xCentro, EJE_PERNO.y, EJE_PERNO.z], [1, 0, 0], [0, 1, 0]);
}

const rango = (desde, hasta, paso) => {
  const valores = [];
  for (let v = desde; v <= hasta + 1e-9; v += paso) valores.push(v);
  return valores;
};

// Punto de escena de un punto con rho con signo (rho < 0: del otro lado del eje, phi = π)
const aEscenaConSigno = (marco, rho, z) => marco.aEscena(Math.abs(rho), z, rho < 0 ? Math.PI : 0);

/*
 * Puntos de sonda del Hito 1 (flechas y brújulas): fijos en el plano de corte alrededor de la
 * bobina, a ambos lados del tubo y por fuera de la bobina. Escena [cm].
 */
export function puntosSondaHito1() {
  const marco = marcoHito1(CENTRO_BOBINA_1[1]);
  const radios = [1.7, 2.5, 3.3, 4.1].flatMap((r) => [r / ESCALA, -r / ESCALA]);
  return rango(-0.1, 0.1, 0.0125).flatMap((z) => radios.map((rho) => aEscenaConSigno(marco, rho, z)));
}

/*
 * Puntos de sonda del Hito 2 en el plano vertical del eje del perno: por fuera de la bobina, sin
 * llegar al sensor (a lo largo del eje) ni al tapete (hacia abajo). Escena [cm].
 * p: parámetros del motor; perno: colocacionPerno(p); r_ext: radio exterior de la bobina [m].
 */
export function puntosSondaHito2(p, perno, r_ext) {
  const marco = marcoHito2(perno);
  const radioMinimo = Math.max(r_ext, p.d_nuc / 2) + 0.006;
  const bajoEje = (EJE_PERNO.y - ALTO_TAPETE) / ESCALA - 0.004;   // hasta 4 mm sobre el tapete
  const zs = rango(-(p.L_nuc / 2 + 0.02), p.L_nuc / 2 + p.d_sensor - 0.004, 0.008);
  const arriba = rango(radioMinimo, 0.04, 0.008);
  const abajo = rango(radioMinimo, bajoEje, 0.008).map((r) => -r);
  return zs.flatMap((z) => [...arriba, ...abajo].map((rho) => aEscenaConSigno(marco, rho, z)));
}
