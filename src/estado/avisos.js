/*
 * Avisos de la simulación del hito activo (sin React). Cada aviso: { id, nivel, texto } con nivel
 * "advertencia" (un límite de la medición) o "peligro" (dañaría el montaje o no se pudo simular).
 */

// Un adaptador de 12 V típico entrega 1 A; se avisa si la corriente lo supera en más de un 10 %
export const CORRIENTE_ADAPTADOR = 1;

const f = (v, decimales) => v.toFixed(decimales);

export function avisosHito(hito, sim, errorSimulacion = null) {
  const avisos = [];
  if (errorSimulacion) avisos.push({ id: "error", nivel: "peligro", texto: `No se pudo simular: ${errorSimulacion}` });
  const { eventos: e, p, d } = sim;

  if (hito === 1) {
    if (e.saturadas > 0) {
      avisos.push({
        id: "adc",
        nivel: "advertencia",
        texto: `El ADC se recorta: ${e.saturadas} muestras en 0 o 1023 (|ε| supera la referencia de ${f(p.V_ref, 2)} V).`,
      });
    }
    return avisos;
  }

  if (e.picoSinDiodo) {
    avisos.push({
      id: "diodo",
      nivel: "peligro",
      texto: `Sin diodo flyback: en cada apagado el colector salta a ${f(e.vCE_max, 0)} V. Ese pico dañaría el TIP120.`,
    });
  }
  if (e.sensorSaturado) {
    avisos.push({ id: "sensor", nivel: "advertencia", texto: `El SS49E se satura: su salida llega a ${f(p.V_sat_min, 2)} V o ${f(p.V_sat_max, 2)} V.` });
  }
  if (e.nucleoSaturado) {
    avisos.push({ id: "nucleo", nivel: "advertencia", texto: `El núcleo se satura: M/Ms llega a ${f(e.M_Ms_max, 2)}.` });
  }
  if (e.limitadaPorTransistor) {
    avisos.push({ id: "transistor", nivel: "advertencia", texto: `La corriente la limita el TIP120 (β·I_B = ${f(d.I_C_max, 2)} A), no el solenoide.` });
  } else if (e.I_on > 1.1 * CORRIENTE_ADAPTADOR) {
    avisos.push({
      id: "fuente",
      nivel: "advertencia",
      texto: `La corriente al 100 % (${f(e.I_on, 2)} A) supera lo que entrega un adaptador de ${CORRIENTE_ADAPTADOR} A.`,
    });
  }
  return avisos;
}
