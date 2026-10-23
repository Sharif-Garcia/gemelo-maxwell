/* Atajos de teclado globales (adaptados del polipasto). No se activan al escribir en un campo de
   texto, en un selector ni con Ctrl/Alt/Cmd.
   Espacio: play/pausa · R: reiniciar · 1-5: vistas del hito · flechas: paso manual en pausa ·
   C: líneas de campo · A: estudio / análisis · Tab: cambiar de hito · F: medidor de FPS ·
   P: presentación · H o ?: ayuda · Esc: cerrar.
   Tab solo cambia de hito si el foco no está en un control, para no romper la navegación con
   el teclado entre botones y deslizadores. */
import { useEffect } from "react";
import { usarGemelo } from "../estado/usarGemelo.js";
import { VISTAS } from "../componentes/escena/comunes/vistas.js";

// Elementos donde las teclas son del usuario: campos de texto y selectores reciben
// todas; en un slider (type="range") solo las flechas, que lo mueven.
export function teclaParaElElemento(el, tecla) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const etiqueta = el.tagName;
  if (etiqueta === "TEXTAREA" || etiqueta === "SELECT") return true;
  if (etiqueta !== "INPUT") return false;
  if (el.type === "range") return tecla === "ArrowLeft" || tecla === "ArrowRight";
  return el.type !== "checkbox" && el.type !== "button";
}

// Controles que se recorren con Tab
export function esControl(el) {
  return !!el && ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
}

export function accionDeTecla(e, hito) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === " ") return { tipo: "reproduccion" };
  if (e.key === "r" || e.key === "R") return { tipo: "reiniciar" };
  if (e.key === "f" || e.key === "F") return { tipo: "fps" };
  if (e.key === "c" || e.key === "C") return { tipo: "lineas" };
  if (e.key === "a" || e.key === "A") return { tipo: "modo" };
  if (e.key === "p" || e.key === "P") return { tipo: "presentacion" };
  if (e.key === "h" || e.key === "H" || e.key === "?") return { tipo: "ayuda" };
  if (e.key === "Escape") return { tipo: "escape" };
  if (e.key === "Tab" && !e.shiftKey) return { tipo: "hito" };
  if (e.key === "ArrowLeft") return { tipo: "paso", sentido: -1 };
  if (e.key === "ArrowRight") return { tipo: "paso", sentido: 1 };
  const n = Number(e.key);
  const vistas = VISTAS[hito];
  if (Number.isInteger(n) && n >= 1 && n <= vistas.length) return { tipo: "vista", id: vistas[n - 1].id };
  return null;
}

export function useAtajos() {
  useEffect(() => {
    const alPresionar = (e) => {
      if (teclaParaElElemento(e.target, e.key)) return;
      const g = usarGemelo.getState();
      const accion = accionDeTecla(e, g.hito);
      if (!accion) return;
      if (accion.tipo === "hito" && esControl(e.target)) return;
      e.preventDefault();   // espacio no "pulsa" el botón enfocado ni desplaza la página
      if (accion.tipo === "reproduccion") g.alternarReproduccion();
      if (accion.tipo === "reiniciar") g.reiniciar();
      if (accion.tipo === "fps") g.alternarFPS();
      if (accion.tipo === "lineas") g.setCampo("lineas", !g.campo.lineas);
      if (accion.tipo === "modo") g.alternarModo();
      if (accion.tipo === "presentacion") g.alternarPresentacion();
      if (accion.tipo === "ayuda") g.alternarAyuda();
      if (accion.tipo === "escape") g.escape();
      if (accion.tipo === "hito") g.alternarHito();
      if (accion.tipo === "paso") g.pasoManual(accion.sentido);
      if (accion.tipo === "vista") g.setVista(accion.id);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);
}
