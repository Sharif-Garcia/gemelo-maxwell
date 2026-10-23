/* Utilidades compartidas por los componentes del modo análisis (sin React). */
import { instanteHito1, instanteHito2 } from "../../../analisis/analisis.js";

export const TAMANO_ETIQUETA = 12;   // px

// Solicitud de una etiqueta para el acomodo de ModoAnalisis (se llama en useFrame)
export function pedirEtiqueta(solicitudes, etiqueta, punto, texto, { ancla = "left", prioridad = 10, tamano = TAMANO_ETIQUETA } = {}) {
  if (etiqueta) solicitudes.current.push({ etiqueta, punto, texto, ancla, prioridad, tamano });
}

// Instante del hito activo a partir del estado (cámara lenta del PWM incluida)
export function instanteActual(s) {
  return s.hito === 1
    ? instanteHito1(s.sim, s.indice)
    : instanteHito2(s.sim, s.t, { camaraLenta: s.camaraLentaPWM, fase: s.fasePWM });
}
