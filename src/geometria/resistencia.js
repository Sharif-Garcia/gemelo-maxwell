/* Código de colores de resistencias de 4 bandas (dos cifras, multiplicador y tolerancia dorada). */

export const COLORES_BANDA = [
  { nombre: "negro", hex: "#1b1b1b" },
  { nombre: "café", hex: "#6b3a1e" },
  { nombre: "rojo", hex: "#c62828" },
  { nombre: "naranja", hex: "#ef6c00" },
  { nombre: "amarillo", hex: "#f9c80e" },
  { nombre: "verde", hex: "#2e7d32" },
  { nombre: "azul", hex: "#1e5bb8" },
  { nombre: "violeta", hex: "#7b3fa0" },
  { nombre: "gris", hex: "#8a8a8a" },
  { nombre: "blanco", hex: "#f2f2f2" },
];
export const DORADO = { nombre: "dorado", hex: "#c9a43a" };

export function bandasResistencia(ohmios) {
  if (!(ohmios >= 10)) throw new Error("Solo resistencias de 10 Ω o más");
  let exponente = Math.floor(Math.log10(ohmios)) - 1;
  let cifras = Math.round(ohmios / 10 ** exponente);
  if (cifras === 100) {
    cifras = 10;
    exponente += 1;
  }
  return [COLORES_BANDA[Math.floor(cifras / 10)], COLORES_BANDA[cifras % 10], COLORES_BANDA[exponente], DORADO];
}
