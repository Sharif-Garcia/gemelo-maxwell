/*
 * Estado global del gemelo digital (zustand): única fuente de verdad del hito activo, sus
 * parámetros, su simulación y el reloj de reproducción.
 *
 * Los campos del hito activo están en el nivel superior (t, indice, sim, parametros...), igual
 * que en el polipasto; los del otro hito se guardan en `guardados` y se restauran al volver.
 * Los componentes que necesitan valores en cada cuadro NO deben suscribirse a t con un
 * selector: deben leer getState() en useFrame o usar usarGemelo.subscribe con refs.
 */

import { create } from "zustand";
import * as faraday from "../fisica/faraday.js";
import * as ampere from "../fisica/ampere.js";
import { ESCENARIO_DEFECTO, PARAMETROS_DEFECTO, parametrosDeEscenario } from "./escenarios.js";
import { acotarValor, ajustarDependientes } from "./parametros.js";
import { leerMedicion } from "../utilidades/csv.js";
import { ajustarPulso, parametrosDelAjuste } from "../utilidades/ajuste.js";

export const MOTORES = { 1: faraday, 2: ampere };

// El pulso del Hito 1 dura milisegundos: se reproduce en cámara lenta por defecto
export const VELOCIDADES = { 1: [0.01, 0.02, 0.05, 0.1, 0.25, 1], 2: [0.5, 1, 2, 4] };
export const VELOCIDAD_DEFECTO = { 1: 0.05, 2: 1 };
export const PASO_FLECHAS = { 1: 0.5e-3, 2: 0.1 };   // avance con las flechas en pausa [s]
export const RETARDO_RECALCULO_MS = 60;               // debounce de los sliders
export const FACTOR_CAMARA_LENTA = 0.001;             // cámara lenta del PWM (Hito 2)

// Representaciones del campo (combinables), número de líneas por plano y de planos alrededor del eje
export const CAMPO_DEFECTO = Object.freeze({
  lineas: true,
  mapa: false,
  flechas: false,
  brujulas: false,
  nLineas: 7,
  nPlanos: 8,
});
export const LIMITES_CAMPO = { nLineas: [3, 15], nPlanos: [2, 16] };

// Duración de la simulación [s]
export const duracion = (sim) => sim.r.t[sim.Nt - 1];

let temporizadorRecalculo = null;

function simularConTiempo(hito, parametros) {
  const inicio = performance.now();
  const sim = MOTORES[hito].simular(parametros);
  return { sim, msSimulacion: performance.now() - inicio };
}

function estadoInicialHito(hito) {
  const escenario = ESCENARIO_DEFECTO[hito];
  const parametros = parametrosDeEscenario(hito, escenario);
  return {
    parametros,
    escenario,
    ...simularConTiempo(hito, parametros),
    errorSimulacion: null,
    t: 0,
    indice: 0,
    reproduciendo: false,
    velocidad: VELOCIDAD_DEFECTO[hito],
    bucle: false,
    vista: "general",
    solicitudVista: 0,
    // Medición del Arduino cargada: { nombre, datos (de csv.js), ajuste (Hito 1) } o null
    medicion: null,
    erroresMedicion: null,
  };
}

// Campos que pertenecen a cada hito (se guardan y restauran al cambiar de hito)
const CAMPOS_HITO = [
  "parametros", "escenario", "sim", "msSimulacion", "errorSimulacion",
  "t", "indice", "reproduciendo", "velocidad", "bucle", "vista", "solicitudVista",
  "medicion", "erroresMedicion",
];
const extraerHito = (s) => Object.fromEntries(CAMPOS_HITO.map((c) => [c, s[c]]));

export const usarGemelo = create((set, get) => ({
  hito: 1,
  ...estadoInicialHito(1),
  guardados: { 2: estadoInicialHito(2) },

  // Cambia de hito conservando parámetros, escenario, tiempo y vista de cada uno
  setHito: (hito) => {
    const s = get();
    if (hito === s.hito) return;
    clearTimeout(temporizadorRecalculo);
    const actual = { ...extraerHito(s), reproduciendo: false };
    const { [hito]: destino, ...resto } = s.guardados;
    set({ hito, ...destino, reproduciendo: false, camaraLentaPWM: false, guardados: { ...resto, [s.hito]: actual } });
  },
  alternarHito: () => get().setHito(get().hito === 1 ? 2 : 1),

  /* Parámetros y simulación */

  // Cambia un parámetro al instante (acotado a su rango y paso, corrigiendo los que dependen
  // de él), marca el escenario como personalizado y recalcula con retardo.
  setParametro: (nombre, valor) => get().setParametros({ [nombre]: valor }),
  setParametros: (cambios) => {
    set((s) => {
      let parametros = s.parametros;
      for (const [nombre, valor] of Object.entries(cambios)) {
        parametros = { ...parametros, [nombre]: acotarValor(s.hito, nombre, valor, parametros) };
      }
      return { parametros: ajustarDependientes(s.hito, parametros), escenario: null };
    });
    clearTimeout(temporizadorRecalculo);
    temporizadorRecalculo = setTimeout(() => get().recalcular(), RETARDO_RECALCULO_MS);
  },

  // Recalcula sin mover el tiempo de reproducción (acotado a la nueva duración). Si el motor
  // rechaza la combinación de parámetros, conserva la simulación anterior y guarda el error.
  recalcular: () => {
    clearTimeout(temporizadorRecalculo);
    const { hito, parametros, t } = get();
    let nuevo;
    try {
      nuevo = simularConTiempo(hito, parametros);
    } catch (error) {
      set({ errorSimulacion: error.message });
      return;
    }
    const tAcotado = Math.min(t, duracion(nuevo.sim));
    set({ ...nuevo, errorSimulacion: null, t: tAcotado, indice: MOTORES[hito].indice(nuevo.sim, tAcotado) });
  },

  restablecerParametro: (nombre) => get().setParametro(nombre, PARAMETROS_DEFECTO[get().hito][nombre]),
  restablecerTodo: () => get().aplicarEscenario(ESCENARIO_DEFECTO[get().hito]),

  aplicarEscenario: (id) => {
    set({ parametros: parametrosDeEscenario(get().hito, id), escenario: id });
    get().recalcular();
    get().reiniciar();
  },

  /* Medición del Arduino (validación, Fase 11) */

  cargarMedicion: (texto, nombre) => {
    const datos = leerMedicion(get().hito, texto);
    if (!datos.ok) set({ erroresMedicion: datos.errores });
    else set({ medicion: { nombre, datos, ajuste: null }, erroresMedicion: null });
  },
  quitarMedicion: () => set({ medicion: null, erroresMedicion: null }),
  // Hito 1: ajusta velocidad, cruce y polaridad al pulso medido con la geometría actual
  ajustarMedicion: () => {
    const { hito, medicion, sim } = get();
    if (hito !== 1 || !medicion) return;
    set({ medicion: { ...medicion, ajuste: ajustarPulso(medicion.datos, sim) } });
  },
  // Lleva el ajuste a los parámetros (acotados a su rango) y recalcula al instante
  aplicarAjuste: () => {
    const ajuste = get().medicion?.ajuste;
    if (!ajuste?.ok) return;
    get().setParametros(parametrosDelAjuste(ajuste));
    get().recalcular();
  },

  /* Reloj de reproducción */

  play: () => {
    // Si ya terminó, vuelve a empezar desde 0; reproducir el barrido sale de la cámara lenta PWM
    if (get().t >= duracion(get().sim)) get().irA(0);
    set({ reproduciendo: true, camaraLentaPWM: false });
  },
  pausa: () => set({ reproduciendo: false }),
  reiniciar: () => {
    set({ reproduciendo: false });
    get().irA(0);
  },
  alternarReproduccion: () => (get().reproduciendo ? get().pausa() : get().play()),
  // Avance cuadro a cuadro (flechas): solo en pausa
  pasoManual: (sentido) => {
    const { reproduciendo, t, hito } = get();
    if (!reproduciendo) get().irA(t + sentido * PASO_FLECHAS[hito]);
  },
  setVelocidad: (velocidad) => {
    if (VELOCIDADES[get().hito].includes(velocidad)) set({ velocidad });
  },
  setBucle: (bucle) => set({ bucle }),

  // Mueve la reproducción al instante t (acotado a [0, duración]) y devuelve el índice
  irA: (t) => {
    const { sim, hito } = get();
    const tAcotado = Math.min(Math.max(t, 0), duracion(sim));
    const indice = MOTORES[hito].indice(sim, tAcotado);
    set({ t: tAcotado, indice });
    return indice;
  },

  /* Cámara lenta del PWM (Hito 2): con el barrido en pausa, la fase recorre un periodo del paso
     actual a FACTOR_CAMARA_LENTA (un periodo de 2.04 ms dura 2 s) */
  camaraLentaPWM: false,
  fasePWM: 0,   // [s] dentro del periodo
  alternarCamaraLentaPWM: () => {
    if (get().hito !== 2) return;
    set((s) => ({ camaraLentaPWM: !s.camaraLentaPWM, reproduciendo: false, fasePWM: 0 }));
  },

  // Avanza el reloj dtReal segundos de tiempo real (lo llama useReloj en cada cuadro)
  avanzar: (dtReal) => {
    const { reproduciendo, velocidad, bucle, t, sim, camaraLentaPWM, fasePWM, hito } = get();
    if (camaraLentaPWM && hito === 2) {
      set({ fasePWM: (fasePWM + dtReal * FACTOR_CAMARA_LENTA) % sim.d.T_PWM });
      return;
    }
    if (!reproduciendo) return;
    const tf = duracion(sim);
    const tNuevo = t + dtReal * velocidad;
    if (tNuevo < tf) {
      get().irA(tNuevo);
    } else if (bucle) {
      get().irA(tNuevo - tf);
    } else {
      get().irA(tf);
      set({ reproduciendo: false });
    }
  },

  /* Cámara: solicitudVista aumenta en cada clic para repetir la misma vista */
  setVista: (vista) => set((s) => ({ vista, solicitudVista: s.solicitudVista + 1 })),

  /* Escena e interfaz (comunes a ambos hitos) */
  modo: "estudio",   // "estudio" o "analisis"
  alternarModo: () => set((s) => ({ modo: s.modo === "estudio" ? "analisis" : "estudio" })),
  calidad: "alta",   // la baja PerformanceMonitor si faltan cuadros
  setCalidad: (calidad) => set({ calidad }),
  mostrarFPS: false,
  alternarFPS: () => set((s) => ({ mostrarFPS: !s.mostrarFPS })),
  // Paneles laterales y modo presentación: definen el área libre que encuadra la cámara
  paneles: { parametros: true, valores: true },
  alternarPanel: (nombre) => set((s) => ({ paneles: { ...s.paneles, [nombre]: !s.paneles[nombre] } })),
  presentacion: false,
  alternarPresentacion: () => set((s) => ({ presentacion: !s.presentacion })),
  // Ayuda (tecla H o ?); Escape la cierra y, si no está abierta, sale del modo presentación
  ayuda: false,
  alternarAyuda: () => set((s) => ({ ayuda: !s.ayuda })),
  escape: () => set((s) => (s.ayuda ? { ayuda: false } : { presentacion: false })),
  // La escena ya dibujó su primer cuadro (lo marca PrimerCuadro; pantalla de carga)
  escenaLista: false,

  // Captura PNG de la escena: cada solicitud la atiende Capturador dentro del lienzo
  solicitudCaptura: 0,
  capturarEscena: () => set((s) => ({ solicitudCaptura: s.solicitudCaptura + 1 })),

  /* Visualización del campo magnético (común a ambos hitos) */
  campo: { ...CAMPO_DEFECTO },
  setCampo: (nombre, valor) => set((s) => ({ campo: { ...s.campo, [nombre]: valor } })),
  // Escala de color en uso [log10 Bmin, log10 Bmax] (la publica la escena; la lee la barra de colores)
  escalaCampo: null,
}));
