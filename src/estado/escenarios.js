/*
 * Escenarios predefinidos de cada hito (CLAUDE.md). Los parámetros por defecto son los
 * PARAMETROS_BASE de cada motor; cada escenario solo indica lo que cambia.
 */

import { PARAMETROS_BASE as BASE_1 } from "../fisica/faraday.js";
import { PARAMETROS_BASE as BASE_2 } from "../fisica/ampere.js";

export const PARAMETROS_DEFECTO = { 1: { ...BASE_1 }, 2: { ...BASE_2 } };

export const ESCENARIOS = {
  1: [
    { id: "caida", nombre: "Caída libre", descripcion: "El imán cae desde 100 mm sobre el centro de la bobina (1.40 m/s al cruzarla).", cambios: {} },
    { id: "lento", nombre: "Lento", descripcion: "Velocidad constante de 0.3 m/s (pregunta 2).", cambios: { tipoMovimiento: "constante", v: 0.3 } },
    { id: "medio", nombre: "Medio", descripcion: "Velocidad constante de 1 m/s (pregunta 2).", cambios: { tipoMovimiento: "constante", v: 1 } },
    { id: "rapido", nombre: "Rápido", descripcion: "Velocidad constante de 3 m/s (pregunta 2).", cambios: { tipoMovimiento: "constante", v: 3 } },
    { id: "saturacion-adc", nombre: "Saturación del ADC", descripcion: "A 4 m/s la FEM supera ±2.5 V y A0 se recorta en 0 y 1023 (pregunta 3).", cambios: { tipoMovimiento: "constante", v: 4 } },
    { id: "sin-filtro", nombre: "Sin filtro", descripcion: "Media móvil desactivada: más ruido, sin atraso.", cambios: { N_filtro: 1 } },
    { id: "filtro-largo", nombre: "Filtro largo", descripcion: "Media móvil de 10 muestras: señal suave pero atrasada y atenuada.", cambios: { N_filtro: 10 } },
    { id: "vaiven", nombre: "Vaivén manual", descripcion: "Meter y sacar el imán con la mano: 60 mm a 1.5 Hz.", cambios: { tipoMovimiento: "vaiven" } },
    { id: "dipolo", nombre: "Modelo dipolo", descripcion: "Imán como dipolo puntual, para comparar con el modelo cilindro.", cambios: { modelo: "dipolo" } },
  ],
  2: [
    { id: "estandar", nombre: "Estándar", descripcion: "Perno de hierro dulce, sensor a 3 mm, fuente de 12 V.", cambios: {} },
    { id: "sin-nucleo", nombre: "Sin núcleo", descripcion: "Bobina en aire: el campo en el sensor queda por debajo de lo que el Hall puede ver.", cambios: { nucleo: "aire" } },
    { id: "sensor-5mm", nombre: "Sensor a 5 mm", descripcion: "El sensor más lejos del extremo del núcleo: menos campo.", cambios: { d_sensor: 5e-3 } },
    { id: "saturacion-sensor", nombre: "Saturación del sensor", descripcion: "Más espiras y más corriente con el sensor a 1 mm: el SS49E llega a 4.21 V.", cambios: { N: 300, R_fuente: 2, d_sensor: 1e-3 } },
    { id: "saturacion-nucleo", nombre: "Saturación del núcleo", descripcion: "Clavo de hierro largo y delgado (3 × 100 mm): el núcleo se satura.", cambios: { N: 400, d_nuc: 3e-3, L_nuc: 100e-3, R_fuente: 2 } },
    { id: "sin-diodo", nombre: "Sin diodo flyback", descripcion: "Sin protección: el colector salta a 60 V en cada apagado.", cambios: { con_diodo: false } },
    { id: "barrido-fino", nombre: "Barrido fino", descripcion: "Pasos de 5 % en lugar de 10 %.", cambios: { paso: 5 } },
  ],
};

export const ESCENARIO_DEFECTO = { 1: "caida", 2: "estandar" };

export function parametrosDeEscenario(hito, id) {
  const escenario = ESCENARIOS[hito].find((e) => e.id === id);
  return { ...PARAMETROS_DEFECTO[hito], ...(escenario ? escenario.cambios : {}) };
}
