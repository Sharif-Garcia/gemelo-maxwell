/* Materiales PBR compartidos por todas las piezas (una sola instancia de cada uno). */
import { MeshStandardMaterial, MeshPhysicalMaterial } from "three";

export const MATERIALES = {
  pcbCanto: new MeshStandardMaterial({ color: "#0a4f61", roughness: 0.6 }),
  plasticoNegro: new MeshStandardMaterial({ color: "#161618", roughness: 0.55 }),
  plasticoNegroMate: new MeshStandardMaterial({ color: "#1d1d20", roughness: 0.85 }),
  plasticoBlanco: new MeshStandardMaterial({ color: "#f2f0e9", roughness: 0.72 }),
  agujero: new MeshStandardMaterial({ color: "#26262a", roughness: 0.9 }),
  niquel: new MeshStandardMaterial({ color: "#c9cbcf", metalness: 1, roughness: 0.28 }),
  estano: new MeshStandardMaterial({ color: "#d0d3d8", metalness: 1, roughness: 0.35 }),
  oro: new MeshStandardMaterial({ color: "#d8b25a", metalness: 1, roughness: 0.3 }),
  aluminio: new MeshStandardMaterial({ color: "#cfd2d6", metalness: 0.9, roughness: 0.4 }),
  cobre: new MeshStandardMaterial({ color: "#c46a2b", metalness: 1, roughness: 0.22 }),
  cuerpoResistencia: new MeshPhysicalMaterial({ color: "#d9c39a", roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.4 }),
  ledApagado: new MeshStandardMaterial({ color: "#e8d9b0", roughness: 0.3 }),
  // Alambre de cobre con esmalte: brillo metálico bajo una capa transparente
  cobreEsmaltado: new MeshPhysicalMaterial({ color: "#b8592a", metalness: 1, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
  // Acrílico transparente del tubo del Hito 1
  acrilico: new MeshPhysicalMaterial({ color: "#ffffff", transmission: 1, roughness: 0.03, thickness: 0.12, ior: 1.49, specularIntensity: 1 }),
  hierroFundido: new MeshStandardMaterial({ color: "#3a3e44", metalness: 0.55, roughness: 0.55 }),
  cromo: new MeshStandardMaterial({ color: "#dfe2e6", metalness: 1, roughness: 0.16 }),
  espuma: new MeshStandardMaterial({ color: "#26272a", roughness: 1 }),
  borneraVerde: new MeshStandardMaterial({ color: "#2f8a52", roughness: 0.5 }),
  // Perno de acero cincado y bloques de madera del Hito 2
  aceroCincado: new MeshStandardMaterial({ color: "#a9aeb4", metalness: 1, roughness: 0.34 }),
  madera: new MeshStandardMaterial({ color: "#c9a37b", roughness: 0.72 }),
};

// Material del aislante de un cable por color (se crea una vez por color)
const aislantes = new Map();
export function materialAislante(color) {
  if (!aislantes.has(color)) aislantes.set(color, new MeshStandardMaterial({ color, roughness: 0.42 }));
  return aislantes.get(color);
}

// Material liso de un color (bandas, LEDs encendidos...)
const lisos = new Map();
export function materialColor(color, { emisivo = 0, roughness = 0.4 } = {}) {
  const clave = `${color}|${emisivo}|${roughness}`;
  if (!lisos.has(clave)) {
    lisos.set(clave, new MeshStandardMaterial({ color, roughness, emissive: emisivo > 0 ? color : "#000000", emissiveIntensity: emisivo }));
  }
  return lisos.get(clave);
}

/*
 * Modo análisis: las piezas que tapan lo que se quiere ver (devanados, perno, soporte, bloques)
 * quedan semitransparentes. El cobre además se tiñe con la corriente (tenirCobre).
 */
const TRANSPARENTES = { cobreEsmaltado: 0.45, aceroCincado: 0.35, hierroFundido: 0.5, cromo: 0.5, madera: 0.45, espuma: 0.5 };

export function aplicarModoMateriales(analisis) {
  for (const [nombre, opacidad] of Object.entries(TRANSPARENTES)) {
    const m = MATERIALES[nombre];
    m.transparent = analisis;
    m.opacity = analisis ? opacidad : 1;
    m.depthWrite = !analisis;
    m.needsUpdate = true;
  }
  if (!analisis) tenirCobre(null, 0);
}

// Brillo del cobre por la corriente (color e intensidad de 0 a 1; null lo apaga)
export function tenirCobre(color, intensidad) {
  const m = MATERIALES.cobreEsmaltado;
  if (color === null || intensidad <= 0) {
    m.emissive.setRGB(0, 0, 0);
    m.emissiveIntensity = 0;
    return;
  }
  m.emissive.set(color);
  m.emissiveIntensity = 0.9 * Math.min(1, intensidad);
}
