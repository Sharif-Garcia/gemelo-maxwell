/* Vistas predefinidas de la cámara por hito (adaptado del polipasto).
   Cada vista tiene una dirección (desde el objetivo hacia la cámara) y las zonas del montaje
   que debe encuadrar (geometria/mesa.js). La distancia se calcula para el fov y la proporción
   reales del área visible. "Seguir imán" además sigue al imán en vivo. */
import { ZONAS, CAJA_TAPETE, CENTRO_BOBINA_1, unionCajas } from "../../../geometria/mesa.js";

export const VISTAS = {
  1: [
    { id: "general", nombre: "General", direccion: [0.15, 0.75, 1], zonas: ["tapete", "arduino", "protoboard", "bobina"] },
    { id: "bobina", nombre: "Bobina", direccion: [-0.35, 0.12, 1], zonas: ["bobina"] },
    { id: "arduino", nombre: "Arduino", direccion: [0.1, 1.1, 0.8], zonas: ["arduino"] },
    { id: "protoboard", nombre: "Protoboard", direccion: [0.05, 1.2, 0.75], zonas: ["protoboard"] },
    { id: "iman", nombre: "Seguir imán", direccion: [-0.4, 0.05, 1], zonas: ["iman"], sigue: true },
  ],
  2: [
    { id: "general", nombre: "General", direccion: [0.15, 0.75, 1], zonas: ["tapete", "solenoide", "protoboard", "arduino", "fuente"] },
    // Desde atrás: por delante está la fuente, que taparía el solenoide
    { id: "solenoide", nombre: "Solenoide y sensor", direccion: [0.3, 0.55, -1], zonas: ["solenoide"] },
    { id: "transistor", nombre: "Transistor y diodo", direccion: [0.2, 0.7, 1], zonas: ["transistor"] },
    { id: "arduino", nombre: "Arduino", direccion: [-0.1, 1.1, 0.8], zonas: ["arduino"] },
    // De frente al plano de corte (vertical, z = 0), desde atrás para que la fuente no lo tape
    { id: "campo", nombre: "Lateral del campo", direccion: [0, 0.1, -1], zonas: ["campo"] },
  ],
};

const MARGEN = 1.08;            // aire alrededor de la caja
export const DISTANCIA_MIN = 4;     // >= minDistance de los controles [cm]
export const DISTANCIA_MAX = 200;   // <= maxDistance de los controles [cm]

export function buscarVista(hito, id) {
  return VISTAS[hito].find((v) => v.id === id) ?? VISTAS[hito][0];
}

const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitario = (a) => { const m = Math.hypot(...a); return a.map((c) => c / m); };

// Caja de una zona; "tapete" es el tapete completo, "iman" sigue la altura visible del imán
// (yIman [cm]) y "campo" rodea al solenoide con espacio para sus líneas de campo
function cajaZona(hito, zona, yIman) {
  if (zona === "tapete") return CAJA_TAPETE;
  if (zona === "iman") {
    const [cx, , cz] = CENTRO_BOBINA_1;
    return { min: [cx - 3, yIman - 4, cz - 3], max: [cx + 3, yIman + 4, cz + 3] };
  }
  if (zona === "campo") {
    // La franja del plano de corte alrededor del solenoide (sus líneas, flechas y brújulas)
    const { min, max } = ZONAS[2].solenoide;
    return { min: [min[0], min[1], -1], max: [max[0], max[1] + 3, 1] };
  }
  return ZONAS[hito][zona];
}

// Caja [min, max] que encuadra la vista (yIman: altura visible del imán en el Hito 1)
export function cajaVista(hito, vista, yIman = CENTRO_BOBINA_1[1]) {
  return unionCajas(vista.zonas.map((z) => cajaZona(hito, z, yIman)));
}

// Base de la cámara: f hacia la cámara, r a la derecha y u hacia arriba de la pantalla
export function baseCamara(direccion) {
  const f = unitario(direccion);
  const r = unitario(cruz([0, 1, 0], f));
  return { f, r, u: cruz(f, r) };
}

// Distancia mínima desde el centro de la caja para que sus 8 esquinas queden en el cuadro
// (perspectiva exacta, con el objetivo en el centro de la caja)
export function distanciaEncuadre(caja, direccion, fovVertical, aspecto, margen = MARGEN) {
  const { f, r, u } = baseCamara(direccion);
  const c = caja.min.map((v, i) => (v + caja.max[i]) / 2);
  const tanV = Math.tan(fovVertical / 2) / margen;
  const tanH = tanV * aspecto;
  let d = 0;
  for (const x of [caja.min[0], caja.max[0]]) {
    for (const y of [caja.min[1], caja.max[1]]) {
      for (const z of [caja.min[2], caja.max[2]]) {
        const q = resta([x, y, z], c);
        const hacia = punto(q, f);   // las esquinas más cerca de la cámara necesitan más distancia
        d = Math.max(d, hacia + Math.abs(punto(q, r)) / tanH, hacia + Math.abs(punto(q, u)) / tanV);
      }
    }
  }
  return d;
}

// Posición y objetivo de la vista para el lienzo (yIman: altura visible del imán en el Hito 1)
export function encuadreVista(hito, id, fovVertical, aspecto, yIman = CENTRO_BOBINA_1[1]) {
  const vista = buscarVista(hito, id);
  const caja = cajaVista(hito, vista, yIman);
  const objetivo = caja.min.map((v, i) => (v + caja.max[i]) / 2);
  const d = Math.min(DISTANCIA_MAX, Math.max(DISTANCIA_MIN,
    distanciaEncuadre(caja, vista.direccion, fovVertical, aspecto)));
  const { f } = baseCamara(vista.direccion);
  return { posicion: objetivo.map((v, i) => v + f[i] * d), objetivo };
}
