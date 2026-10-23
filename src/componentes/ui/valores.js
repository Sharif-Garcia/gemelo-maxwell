/*
 * Filas del panel de valores por hito: instantáneas (se leen del estado en cada cuadro, en
 * unidades de lectura), derivadas de los parámetros y resultados de la simulación.
 * `color` es el de la variable en las gráficas (graficas/series.js), si la tiene.
 */
import { VARIABLES, NOMBRES_CAUSA, seriesDerivadas } from "../../graficas/series.js";

const serie = (hito, clave) => (s) => seriesDerivadas(hito, s.sim)[clave][s.indice];
const conColor = (hito, filas) => filas.map((f) => ({ ...f, color: VARIABLES[hito][f.clave]?.color }));

export const INSTANTANEOS = {
  1: conColor(1, [
    { clave: "t", simbolo: ["t"], nombre: "Tiempo", unidad: "ms", decimales: 2, leer: (s) => s.t * 1e3 },
    { clave: "x", simbolo: ["x"], nombre: "Imán", completo: "Posición del imán respecto del centro de la bobina", unidad: "mm", decimales: 2, leer: serie(1, "x") },
    { clave: "v", simbolo: ["v"], nombre: "Velocidad", completo: "Velocidad del imán", unidad: "m/s", decimales: 3, leer: serie(1, "v") },
    { clave: "Phi", simbolo: ["Φ"], nombre: "Flujo", completo: "Flujo enlazado por la bobina", unidad: "mWb", decimales: 4, leer: serie(1, "Phi") },
    { clave: "emf", simbolo: ["ε"], nombre: "FEM", completo: "FEM inducida ideal", unidad: "V", decimales: 4, leer: serie(1, "emf") },
    { clave: "emfMedida", simbolo: ["ε", "med"], nombre: "Medida", completo: "FEM medida en A0 (filtrada)", unidad: "V", decimales: 4, leer: serie(1, "emfMedida") },
    { clave: "codigo", simbolo: ["A0"], nombre: "Código", completo: "Código del ADC en A0", unidad: "", decimales: 0, leer: serie(1, "codigo") },
    { clave: "codigoFiltrado", simbolo: ["A0", "f"], nombre: "Filtrado", completo: "Código con media móvil", unidad: "", decimales: 1, leer: serie(1, "codigoFiltrado") },
  ]),
  2: conColor(2, [
    { clave: "t", simbolo: ["t"], nombre: "Tiempo", unidad: "s", decimales: 2, leer: (s) => s.t },
    { clave: "D", simbolo: ["D"], nombre: "Ciclo", completo: "Ciclo de trabajo del PWM", unidad: "%", decimales: 0, leer: serie(2, "D") },
    { clave: "valor", simbolo: ["PWM"], nombre: "analogWrite", completo: "Valor de analogWrite(9, valor)", unidad: "", decimales: 0, leer: (s) => Math.round((s.sim.r.D[s.indice] * 255) / 100) },
    { clave: "I_prom", simbolo: ["I"], nombre: "Corriente", completo: "Corriente media del solenoide", unidad: "A", decimales: 4, leer: serie(2, "I_prom") },
    { clave: "M", simbolo: ["M/M", "s"], nombre: "Núcleo", completo: "Magnetización del núcleo respecto de la de saturación", unidad: "", decimales: 4, leer: (s) => (s.sim.d.Ms > 0 ? s.sim.r.M[s.indice] / s.sim.d.Ms : 0) },
    { clave: "B_s", simbolo: ["B", "s"], nombre: "Campo", completo: "Campo en el sensor", unidad: "mT", decimales: 3, leer: serie(2, "B_s") },
    { clave: "V_hall", simbolo: ["V", "hall"], nombre: "Hall", completo: "Salida del SS49E", unidad: "V", decimales: 4, leer: serie(2, "V_hall") },
    { clave: "codigo", simbolo: ["A1"], nombre: "Código", completo: "Promedio de las lecturas en A1", unidad: "", decimales: 1, leer: serie(2, "codigo") },
  ]),
};

// Valores de la tarjeta del modo presentación (un subconjunto de los instantáneos)
const EN_PRESENTACION = { 1: ["t", "x", "v", "emf", "codigo"], 2: ["t", "D", "I_prom", "B_s", "V_hall"] };
export const PRESENTACION = {
  1: INSTANTANEOS[1].filter((f) => EN_PRESENTACION[1].includes(f.clave)),
  2: INSTANTANEOS[2].filter((f) => EN_PRESENTACION[2].includes(f.clave)),
};

// Derivados de los parámetros: [{ clave, simbolo, nombre, unidad, valor(sim) }]
export const DERIVADOS = {
  1: [
    { clave: "N", simbolo: ["N"], nombre: "Espiras", unidad: "", valor: (s) => s.p.N.toFixed(0) },
    { clave: "L_bob", simbolo: ["L", "bob"], nombre: "Largo", completo: "Largo de la bobina", unidad: "mm", valor: (s) => (s.d.L_bob * 1e3).toFixed(2) },
    { clave: "r_ext", simbolo: ["r", "ext"], nombre: "Radio ext.", completo: "Radio exterior de la bobina", unidad: "mm", valor: (s) => (s.d.r_ext * 1e3).toFixed(2) },
    { clave: "R_bob", simbolo: ["R", "bob"], nombre: "Resistencia", completo: "Resistencia de la bobina", unidad: "Ω", valor: (s) => s.d.R_bob.toFixed(2) },
    { clave: "m", simbolo: ["m"], nombre: "Momento", completo: "Momento dipolar del imán", unidad: "A·m²", valor: (s) => s.d.m.toFixed(3) },
  ],
  2: [
    { clave: "R_bob", simbolo: ["R", "bob"], nombre: "Resistencia", completo: "Resistencia del solenoide", unidad: "Ω", valor: (s) => s.d.R_bob.toFixed(3) },
    { clave: "L_s", simbolo: ["L", "s"], nombre: "Inductancia", completo: "Inductancia del solenoide con su núcleo", unidad: "mH", valor: (s) => (s.d.L_s * 1e3).toFixed(3) },
    { clave: "I_on", simbolo: ["I", "on"], nombre: "Encendido", completo: "Corriente con el transistor encendido", unidad: "A", valor: (s) => s.d.I_on.toFixed(4) },
    { clave: "chi_a", simbolo: ["χ", "a"], nombre: "Susceptib.", completo: "Susceptibilidad aparente del núcleo", unidad: "", valor: (s) => s.d.chi_a.toFixed(2) },
    { clave: "f_PWM", simbolo: ["f", "PWM"], nombre: "PWM", completo: "Frecuencia del PWM en D9", unidad: "Hz", valor: (s) => s.d.f_PWM.toFixed(2) },
  ],
};

// Resultados de la simulación (preguntas del taller)
export const RESULTADOS = {
  1: [
    { clave: "pico+", simbolo: ["ε", "+"], nombre: "Pico +", completo: "Pico positivo de la FEM", unidad: "V", valor: (s) => s.eventos.picoPositivo.valor.toFixed(4) },
    { clave: "pico-", simbolo: ["ε", "−"], nombre: "Pico −", completo: "Pico negativo de la FEM", unidad: "V", valor: (s) => s.eventos.picoNegativo.valor.toFixed(4) },
    { clave: "deltaT", simbolo: ["Δt"], nombre: "Entre picos", completo: "Tiempo entre los picos", unidad: "ms", valor: (s) => (s.eventos.deltaT * 1e3).toFixed(2) },
    { clave: "integral", simbolo: ["∫ε dt"], nombre: "Área neta", completo: "Integral de la FEM (tiende a cero)", unidad: "mV·s", valor: (s) => (s.eventos.integral * 1e3).toFixed(4) },
    { clave: "v_centro", simbolo: ["v", "c"], nombre: "En el centro", completo: "Velocidad al cruzar el centro de la bobina", unidad: "m/s", valor: (s) => (s.eventos.v_centro ?? NaN).toFixed(3) },
    { clave: "saturadas", simbolo: ["n", "sat"], nombre: "Recortadas", completo: "Muestras del ADC en 0 o 1023", unidad: "", valor: (s) => String(s.eventos.saturadas) },
  ],
  2: [
    { clave: "pendiente", simbolo: ["dB/dD"], nombre: "Pendiente", completo: "Pendiente de la recta B contra D", unidad: "mT/%", valor: (s) => (s.eventos.regresion.pendiente * 1e3).toFixed(4) },
    { clave: "r2", simbolo: ["R²"], nombre: "Ajuste", completo: "Coeficiente de determinación de la recta", unidad: "", valor: (s) => s.eventos.regresion.r2.toFixed(4) },
    { clave: "M_Ms", simbolo: ["M/M", "s"], nombre: "Núcleo máx.", completo: "Mayor M/Ms del barrido", unidad: "", valor: (s) => s.eventos.M_Ms_max.toFixed(4) },
    { clave: "causa", simbolo: ["causa"], nombre: "Se aplana por", completo: "Causa de la pérdida de linealidad", unidad: "", valor: (s) => (s.eventos.causa ? NOMBRES_CAUSA[s.eventos.causa] : "es lineal") },
  ],
};
