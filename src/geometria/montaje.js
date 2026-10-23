/*
 * Colocación de las piezas comunes de cada montaje y posición en escena de cualquier ubicación
 * del netlist [cm]. Las posiciones `externos` son los terminales de las piezas propias de cada
 * hito (borneras, conectores del sensor) y `salidas` la dirección en que sale su cable (hacia la
 * protoboard). Todas deben quedar dentro de su zona (mesa.js).
 */

import { ALTO_TAPETE } from "./mesa.js";
import { EXTERNOS_HITO_1 } from "./montajeHito1.js";
import { EXTERNOS_HITO_2, SALIDAS_HITO_2 } from "./montajeHito2.js";
import { PLACA, entradaPin } from "./arduino.js";
import { PB, agujeroLocal } from "./protoboard.js";
import { aplicarColocacion } from "./transformar.js";

const y0 = ALTO_TAPETE;

export const MONTAJES = {
  1: {
    // Origen local del Arduino: esquina cercana izquierda de la placa (USB a la izquierda)
    arduino: { posicion: [-20.6, y0, PLACA.fondo / 2], rotY: 0 },
    // Origen local de la protoboard: centro de su cara superior
    protoboard: { posicion: [4.25, y0 + PB.alto, 0], rotY: 0 },
    // Los cables de la bobina salen de la bornera del soporte, hacia la protoboard (-x)
    externos: EXTERNOS_HITO_1,
    salidas: { bobina1: [-1, 0, 0], bobina2: [-1, 0, 0] },
  },
  2: {
    // Girado 180°: USB a la derecha y header digital hacia el frente, como en el boceto
    arduino: { posicion: [15.2, y0, -PLACA.fondo / 2], rotY: Math.PI },
    protoboard: { posicion: [-4.75, y0 + PB.alto, 0], rotY: 0 },
    externos: EXTERNOS_HITO_2,
    salidas: SALIDAS_HITO_2,
  },
};

// Dirección en que sale el cable de una ubicación externa (null: sale hacia arriba)
export function salidaUbicacion(hito, ubicacion) {
  if (!ubicacion.startsWith("ext:")) return null;
  return MONTAJES[hito].salidas?.[ubicacion.slice(4)] ?? null;
}

// Posición en escena de una ubicación del netlist ("arduino:A0", "pb:c10", "ext:hall1")
export function posicionUbicacion(hito, ubicacion) {
  const montaje = MONTAJES[hito];
  const separador = ubicacion.indexOf(":");
  const tipo = ubicacion.slice(0, separador);
  const nombre = ubicacion.slice(separador + 1);
  if (tipo === "arduino") return aplicarColocacion(entradaPin(nombre), montaje.arduino);
  if (tipo === "pb") return aplicarColocacion(agujeroLocal(nombre), montaje.protoboard);
  const externo = montaje.externos[nombre];
  if (!externo) throw new Error(`Terminal externo desconocido en el hito ${hito}: ${nombre}`);
  return externo;
}
