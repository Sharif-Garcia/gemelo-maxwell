/*
 * CSV de ejemplo con el formato que imprime el Arduino, generados por el propio gemelo con otros
 * parámetros (son sintéticos: sirven para probar la carga, el ajuste y la tabla antes de tener
 * una medición real). Los usan el botón "Cargar ejemplo" y las pruebas.
 */

import { simular as simular1 } from "../fisica/faraday.js";
import { simular as simular2 } from "../fisica/ampere.js";
import { aVoltaje } from "../fisica/adc.js";

export const CAMBIOS_EJEMPLO = { 1: { x0: -0.12 }, 2: { N: 100, R_fuente: 12 } };

/*
 * Hito 1 (protocolo START/STOP): Tiempo en ms de millis() y Voltaje en V con 3 decimales.
 * Antes de soltar el imán se registran `retraso` segundos de reposo; el reloj empieza en
 * `inicio` ms, como millis() a mitad de una sesión.
 */
export function ejemploHito1({ cambios = CAMBIOS_EJEMPLO[1], retraso = 0.036, inicio = 15230 } = {}) {
  const { muestras, p } = simular1(cambios);
  const previas = Math.round(retraso / p.Ts);
  const codigos = [...Array.from({ length: previas }, (_, k) => muestras.codigo[k % 10]), ...muestras.codigo];
  const filas = codigos.map((c, k) => `${Math.round(inicio + k * p.Ts * 1e3)},${aVoltaje(c, p.V_cc, p.bits).toFixed(3)}`);
  return ["START", "Tiempo,Voltaje", ...filas, "STOP"].join("\n");
}

// Hito 2: ciclo como valor de analogWrite (0 a 255) y el promedio de las lecturas del Hall en V
export function ejemploHito2({ cambios = CAMBIOS_EJEMPLO[2] } = {}) {
  const { pasos } = simular2(cambios);
  const filas = pasos.map((s) => `${s.valor},${s.V_hall_medido.toFixed(3)}`);
  return ["CicloTrabajo_PWM,Voltaje_Hall", ...filas].join("\n");
}

export const ejemplo = (hito) => (hito === 1 ? ejemploHito1() : ejemploHito2());
