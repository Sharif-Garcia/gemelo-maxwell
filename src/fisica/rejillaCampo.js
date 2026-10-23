/*
 * Rejillas del campo en el semiplano meridional (rho >= 0, z) para fuentes de láminas.
 *
 * En el Hito 2 el campo es I·b_bob + M·b_nuc: se calculan las dos rejillas base una vez por
 * geometría (b_bob por amperio, b_nuc por unidad de M) y el mapa de calor, las flechas y las
 * brújulas solo las combinan. Sobre una lámina (rho = a, dentro de su largo) Brho diverge: esos
 * nodos quedan en 0.
 */

import { campoLamina } from "./campo.js";

// laminas: [{ a, zc, b, K }]. Índice del nodo (i en rho, j en z): j·nRho + i
export function crearRejilla(laminas, { rhoMax, zMin, zMax, nRho, nZ }) {
  const drho = rhoMax / (nRho - 1);
  const dz = (zMax - zMin) / (nZ - 1);
  const Brho = new Float32Array(nRho * nZ);
  const Bz = new Float32Array(nRho * nZ);
  for (let j = 0; j < nZ; j++) {
    const z = zMin + j * dz;
    for (let i = 0; i < nRho; i++) {
      const rho = i * drho;
      let br = 0;
      let bz = 0;
      for (const l of laminas) {
        const campo = campoLamina(rho, z - l.zc, l.a, l.b, l.K);
        br += campo.Brho;
        bz += campo.Bz;
      }
      const k = j * nRho + i;
      Brho[k] = Number.isFinite(br) ? br : 0;
      Bz[k] = Number.isFinite(bz) ? bz : 0;
    }
  }
  return { drho, z0: zMin, dz, nRho, nZ, Brho, Bz };
}

// Interpolación bilineal en (rho, z); fuera de la rejilla se toma el borde
export function muestrearRejilla(rejilla, rho, z) {
  const { drho, z0, dz, nRho, nZ } = rejilla;
  const x = Math.min(nRho - 1, Math.max(0, rho / drho));
  const y = Math.min(nZ - 1, Math.max(0, (z - z0) / dz));
  const i = Math.min(nRho - 2, Math.floor(x));
  const j = Math.min(nZ - 2, Math.floor(y));
  const fx = x - i;
  const fy = y - j;
  const valor = (serie) => {
    const k = j * nRho + i;
    return (1 - fy) * ((1 - fx) * serie[k] + fx * serie[k + 1]) +
      fy * ((1 - fx) * serie[k + nRho] + fx * serie[k + nRho + 1]);
  };
  return { Brho: valor(rejilla.Brho), Bz: valor(rejilla.Bz) };
}

/*
 * Rejillas base del Hito 2 a partir de las fuentes de ampere.derivados (d.fuentes).
 * Por defecto cubren el doble del largo del núcleo y un radio de 30 mm.
 */
export function rejillasAmpere(fuentes, {
  rhoMax = 30e-3, zMin = -2 * fuentes.nucleo.b, zMax = 2 * fuentes.nucleo.b, nRho = 96, nZ = 192,
} = {}) {
  const opciones = { rhoMax, zMin, zMax, nRho, nZ };
  return {
    bob: crearRejilla(fuentes.bobina, opciones),
    nuc: crearRejilla([fuentes.nucleo], opciones),
  };
}

// Campo combinado I·b_bob + M·b_nuc en un punto
export function campoCombinado(rejillas, I, M, rho, z) {
  const bob = muestrearRejilla(rejillas.bob, rho, z);
  const nuc = muestrearRejilla(rejillas.nuc, rho, z);
  return { Brho: I * bob.Brho + M * nuc.Brho, Bz: I * bob.Bz + M * nuc.Bz };
}
