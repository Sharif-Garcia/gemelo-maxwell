/*
 * Líneas de campo de fuentes con simetría axial, en el semiplano meridional (rho >= 0, z) y en SI.
 * CLAUDE.md, "Visualización del campo".
 *
 * - Las fuentes son láminas { a, zc, b, K } (campo.js): imán, capas de una bobina o núcleo.
 * - Siembra por flujo igual: en el plano z = z0 las semillas encierran fracciones iguales del
 *   flujo que atraviesa la fuente, así la densidad de líneas es proporcional a |B|.
 * - Cada línea se integra con RK4 sobre B/|B| (paso que crece con la distancia a la fuente) hasta
 *   cerrarse sobre su semilla o salir del dominio; las abiertas se completan hacia atrás. Los
 *   puntos quedan ordenados en el sentido de B.
 */

import { campoLamina } from "./campo.js";

// Campo total de una lista de láminas; fuera de rango (sobre una lámina) devuelve 0
export function crearCampo(laminas) {
  return (rho, z) => {
    let Brho = 0;
    let Bz = 0;
    for (const l of laminas) {
      const c = campoLamina(Math.abs(rho), z - l.zc, l.a, l.b, l.K);
      Brho += c.Brho;
      Bz += c.Bz;
    }
    if (!Number.isFinite(Brho) || !Number.isFinite(Bz)) return { Brho: 0, Bz: 0 };
    return { Brho: rho < 0 ? -Brho : Brho, Bz };
  };
}

/*
 * Flujo encerrado Φ(rho) = ∫ Bz 2π rho' drho' en el plano z0, desde el eje hasta donde Bz cambia
 * de signo (o rhoMax). Devuelve radios y flujo acumulado.
 */
export function flujoEncerrado(campo, z0, rhoMax, muestras = 600) {
  const h = rhoMax / muestras;
  const radios = [0];
  const flujo = [0];
  let anterior = campo(0, z0).Bz;
  const signo = Math.sign(anterior) || 1;
  for (let i = 1; i <= muestras; i++) {
    const rho = i * h;
    const Bz = campo(rho, z0).Bz;
    if (Math.sign(Bz) !== signo) break;
    flujo.push(flujo.at(-1) + 0.5 * h * 2 * Math.PI * ((rho - h) * anterior + rho * Bz));
    radios.push(rho);
    anterior = Bz;
  }
  return { radios, flujo, signo };
}

// Radios de n semillas que encierran (i - 1/2)/n del flujo total
export function sembrarPorFlujo(campo, { z0 = 0, rhoMax, n }) {
  const { radios, flujo } = flujoEncerrado(campo, z0, rhoMax);
  const total = flujo.at(-1);
  const semillas = [];
  let j = 1;
  for (let i = 1; i <= n; i++) {
    const objetivo = ((i - 0.5) / n) * total;
    while (j < flujo.length - 1 && Math.abs(flujo[j]) < Math.abs(objetivo)) j++;
    const f = (objetivo - flujo[j - 1]) / (flujo[j] - flujo[j - 1] || 1);
    semillas.push(radios[j - 1] + f * (radios[j] - radios[j - 1]));
  }
  return semillas;
}

/*
 * Integra desde (rho0, z0) en el sentido `sentido` (+1 a favor de B, -1 en contra). `escala` es el
 * tamaño de la fuente [m]: fija el paso (escala/80 cerca, creciendo con la distancia al origen).
 * Se detiene al salir del dominio, tras maxPasos, o al volver a cruzar el plano z0 en el mismo
 * sentido cerca de la semilla (línea cerrada).
 */
function integrar(campo, rho0, z0, sentido, { dominio, escala, maxPasos }) {
  const direccion = (rho, z) => {
    const { Brho, Bz } = campo(rho, z);
    const m = Math.hypot(Brho, Bz) || 1e-300;
    return [(sentido * Brho) / m, (sentido * Bz) / m];
  };
  const puntos = [rho0, z0];
  let [rho, z] = [rho0, z0];
  const subeAlInicio = Math.sign(direccion(rho0, z0)[1]);
  let recorrido = 0;
  for (let k = 0; k < maxPasos; k++) {
    const h = (escala / 80) * (1 + Math.hypot(rho, z) / escala);
    const k1 = direccion(rho, z);
    const k2 = direccion(rho + (h / 2) * k1[0], z + (h / 2) * k1[1]);
    const k3 = direccion(rho + (h / 2) * k2[0], z + (h / 2) * k2[1]);
    const k4 = direccion(rho + h * k3[0], z + h * k3[1]);
    const nuevoRho = Math.abs(rho + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
    const nuevoZ = z + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    recorrido += h;
    // Cierre: cruza z0 en el mismo sentido que al salir y cerca de la semilla
    const cruza = (z - z0) * (nuevoZ - z0) <= 0 && Math.sign(nuevoZ - z) === subeAlInicio;
    if (recorrido > 2 * escala && cruza && Math.abs(nuevoRho - rho0) < 0.2 * escala) {
      puntos.push(rho0, z0);
      return { puntos, cerrada: true };
    }
    rho = nuevoRho;
    z = nuevoZ;
    puntos.push(rho, z);
    if (rho > dominio.rhoMax || z < dominio.zMin || z > dominio.zMax) return { puntos, cerrada: false };
  }
  return { puntos, cerrada: false };
}

/*
 * Una línea completa por la semilla, ordenada en el sentido de B: { rho, z, B } (Float64Array) y
 * si se cerró sobre sí misma.
 */
export function trazarLinea(campo, rho0, z0, opciones) {
  const adelante = integrar(campo, rho0, z0, 1, opciones);
  let pares = adelante.puntos;
  if (!adelante.cerrada) {
    const atras = integrar(campo, rho0, z0, -1, opciones).puntos;
    const invertidos = [];
    for (let i = atras.length - 2; i >= 2; i -= 2) invertidos.push(atras[i], atras[i + 1]);
    pares = [...invertidos, ...pares];
  }
  const n = pares.length / 2;
  const rho = new Float64Array(n);
  const z = new Float64Array(n);
  const B = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    rho[i] = pares[2 * i];
    z[i] = pares[2 * i + 1];
    const c = campo(rho[i], z[i]);
    B[i] = Math.hypot(c.Brho, c.Bz);
  }
  return { rho, z, B, cerrada: adelante.cerrada };
}

/*
 * Líneas de un conjunto de láminas: n semillas en el plano z0 (hasta rhoSiembra) y dominio de
 * integración. Devuelve { lineas, Bmax } (Bmax: el mayor |B| sobre las líneas).
 */
export function trazarLineas(laminas, { n, z0 = 0, rhoSiembra, escala, dominio, maxPasos = 4000 }) {
  const campo = crearCampo(laminas);
  const semillas = sembrarPorFlujo(campo, { z0, rhoMax: rhoSiembra, n });
  const lineas = semillas.map((rho0) => trazarLinea(campo, rho0, z0, { dominio, escala, maxPasos }));
  let Bmax = 0;
  for (const l of lineas) for (const b of l.B) if (b > Bmax) Bmax = b;
  return { lineas, Bmax };
}

// Campo en puntos (rho, z) dados como pares [rho, z]: para flechas y brújulas
export function campoEnPuntos(laminas, puntos) {
  const campo = crearCampo(laminas);
  return puntos.map(([rho, z]) => campo(rho, z));
}
