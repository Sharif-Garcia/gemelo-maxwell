/*
 * Arduino Uno R3 a escala real [cm]. Funciones puras (sin three.js).
 *
 * Coordenadas del plano del shield en mil (1 mil = 0.00254 cm) con origen en la esquina inferior
 * izquierda de la placa, USB y jack a la izquierda, header digital arriba y los de potencia y
 * analógicos abajo. En el marco local de la pieza: x = u (a lo largo de la placa) y z = -v (el
 * header digital queda hacia -z), con y = 0 en la cara inferior del PCB.
 */

export const MIL = 0.00254;

export const PLACA = {
  ancho: 2700 * MIL,     // 6.858 cm
  fondo: 2100 * MIL,     // 5.334 cm
  espesor: 0.16,
  elevacion: 0.18,       // el PCB descansa sobre las soldaduras de su cara inferior
};

export const ALTO_HEADER = 0.85;   // headers hembra de 8.5 mm

// Headers hembra: pines en orden y coordenadas [u, v] en mil del primero; paso de 100 mil en u
export const HEADERS = [
  { id: "digitalAlto", pines: ["SCL", "SDA", "AREF", "GND3", "D13", "D12", "D11", "D10", "D9", "D8"], u0: 840, v: 2000 },
  { id: "digitalBajo", pines: ["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"], u0: 1900, v: 2000 },
  { id: "potencia", pines: ["NC", "IOREF", "RESET", "3V3", "5V", "GND1", "GND2", "VIN"], u0: 1000, v: 100 },
  { id: "analogico", pines: ["A0", "A1", "A2", "A3", "A4", "A5"], u0: 2000, v: 100 },
];

// Pines del header digital alto van de SCL (u = 840) a D8 (1740); el bajo de D7 (1900) a D0 (2600):
// los pines dentro de cada header avanzan +100 mil, salvo el digital bajo, que es D7 → D0 en +u.
const PINES = (() => {
  const mapa = {};
  for (const h of HEADERS) h.pines.forEach((nombre, i) => { mapa[nombre] = [h.u0 + 100 * i, h.v]; });
  return mapa;
})();

// Pines conectados entre sí dentro de la placa (todas las tierras)
export const PUENTES_INTERNOS = [["GND1", "GND2", "GND3"]];

export const existePin = (nombre) => nombre in PINES;

// Coordenadas [u, v] en mil
export function pinMil(nombre) {
  const p = PINES[nombre];
  if (!p) throw new Error(`Pin desconocido del Arduino: ${nombre}`);
  return p;
}

const aLocal = ([u, v], y) => [u * MIL, y, -v * MIL];

// Punto local donde entra un conector macho: centro del agujero, en la cara superior del header
export function entradaPin(nombre) {
  return aLocal(pinMil(nombre), PLACA.elevacion + PLACA.espesor + ALTO_HEADER);
}

// Centro de cada header (local) y su largo en u, para dibujarlos
export function geometriaHeaders() {
  return HEADERS.map((h) => {
    const n = h.pines.length;
    const uCentro = h.u0 + 50 * (n - 1);
    return { id: h.id, n, centro: aLocal([uCentro, h.v], PLACA.elevacion + PLACA.espesor + ALTO_HEADER / 2), largo: n * 100 * MIL };
  });
}

// Piezas de la placa (decorativas) en mil: centro [u, v], tamaño [du, dv] y alto en cm
export const PIEZAS = {
  usb: { centro: [65, 1490], tamano: [630, 472], alto: 1.09 },        // sobresale 6.3 mm por la izquierda
  jack: { centro: [205, 330], tamano: [550, 354], alto: 1.1 },
  atmega: { centro: [1970, 680], tamano: [1400, 285], alto: 0.38 },  // DIP-28
  u16: { centro: [830, 1250], tamano: [197, 197], alto: 0.1 },        // ATmega16U2 (QFN)
  cristal: { centro: [1060, 1020], tamano: [433, 181], alto: 0.35 },  // HC-49/S
  regulador: { centro: [740, 330], tamano: [256, 260], alto: 0.18 },  // SOT-223
  reset: { centro: [330, 1950], tamano: [236, 236], alto: 0.35 },
  icsp: { centro: [2560, 1050], tamano: [200, 300], alto: 0.85 },     // 2 × 3 pines macho
};

export const CONDENSADORES = [[740, 640], [990, 640]];   // electrolíticos de 47 µF (Ø 6.3 mm)
export const AGUJEROS_MONTAJE = [[550, 100], [600, 2000], [2600, 300], [2600, 1400]];
export const LEDS = [
  { nombre: "ON", centro: [2380, 1180], color: "#3ddc6a" },
  { nombre: "L", centro: [1330, 1660], color: "#ffb02e" },
  { nombre: "TX", centro: [1330, 1560], color: "#ffb02e" },
  { nombre: "RX", centro: [1330, 1470], color: "#ffb02e" },
];

// Esquinas locales de la placa con el USB, para encuadres y pruebas de colocación
export function contornoLocal() {
  const alto = PLACA.elevacion + PLACA.espesor + Math.max(ALTO_HEADER, PIEZAS.jack.alto);
  const uMin = (PIEZAS.usb.centro[0] - PIEZAS.usb.tamano[0] / 2) * MIL;
  return [
    [uMin, 0, 0], [PLACA.ancho, 0, 0], [uMin, 0, -PLACA.fondo], [PLACA.ancho, 0, -PLACA.fondo],
    [uMin, alto, 0], [PLACA.ancho, alto, -PLACA.fondo],
  ];
}
