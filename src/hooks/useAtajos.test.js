/* Pruebas de los atajos de teclado (sin DOM: elementos y eventos simulados). */
import { describe, test, expect } from "vitest";
import { accionDeTecla, esControl, teclaParaElElemento } from "./useAtajos.js";
import { VISTAS } from "../componentes/escena/comunes/vistas.js";

const tecla = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...extra });

describe("Acciones", () => {
  test("espacio, R, F, C, A, P, H, Esc, Tab y flechas", () => {
    expect(accionDeTecla(tecla(" "), 1)).toEqual({ tipo: "reproduccion" });
    expect(accionDeTecla(tecla("r"), 1)).toEqual({ tipo: "reiniciar" });
    expect(accionDeTecla(tecla("R"), 2)).toEqual({ tipo: "reiniciar" });
    expect(accionDeTecla(tecla("f"), 1)).toEqual({ tipo: "fps" });
    expect(accionDeTecla(tecla("c"), 1)).toEqual({ tipo: "lineas" });
    expect(accionDeTecla(tecla("C"), 2)).toEqual({ tipo: "lineas" });
    expect(accionDeTecla(tecla("a"), 1)).toEqual({ tipo: "modo" });
    expect(accionDeTecla(tecla("A"), 2)).toEqual({ tipo: "modo" });
    expect(accionDeTecla(tecla("p"), 1)).toEqual({ tipo: "presentacion" });
    expect(accionDeTecla(tecla("h"), 1)).toEqual({ tipo: "ayuda" });
    expect(accionDeTecla(tecla("?"), 2)).toEqual({ tipo: "ayuda" });
    expect(accionDeTecla(tecla("Escape"), 1)).toEqual({ tipo: "escape" });
    expect(accionDeTecla(tecla("Tab"), 1)).toEqual({ tipo: "hito" });
    expect(accionDeTecla(tecla("ArrowLeft"), 1)).toEqual({ tipo: "paso", sentido: -1 });
    expect(accionDeTecla(tecla("ArrowRight"), 2)).toEqual({ tipo: "paso", sentido: 1 });
  });

  test("1 a 5 son las vistas del hito activo", () => {
    for (const hito of [1, 2]) {
      VISTAS[hito].forEach((v, i) => expect(accionDeTecla(tecla(String(i + 1)), hito)).toEqual({ tipo: "vista", id: v.id }));
    }
    expect(accionDeTecla(tecla("2"), 1).id).not.toBe(accionDeTecla(tecla("2"), 2).id);
  });

  test("otras teclas y combinaciones con Ctrl/Alt/Cmd/Shift+Tab no hacen nada", () => {
    expect(accionDeTecla(tecla("6"), 1)).toBeNull();
    expect(accionDeTecla(tecla("0"), 1)).toBeNull();
    expect(accionDeTecla(tecla("x"), 1)).toBeNull();
    expect(accionDeTecla(tecla("r", { ctrlKey: true }), 1)).toBeNull();
    expect(accionDeTecla(tecla("1", { altKey: true }), 1)).toBeNull();
    expect(accionDeTecla(tecla("Tab", { shiftKey: true }), 1)).toBeNull();
  });
});

describe("No se activan al escribir", () => {
  const input = (type) => ({ tagName: "INPUT", type });

  test("campos de texto, selectores y áreas de texto reciben todas las teclas", () => {
    for (const el of [input("text"), input("number"), { tagName: "SELECT" }, { tagName: "TEXTAREA" }, { tagName: "DIV", isContentEditable: true }]) {
      for (const k of [" ", "r", "1", "ArrowLeft"]) expect(teclaParaElElemento(el, k)).toBe(true);
    }
  });

  test("en un slider solo las flechas son del slider", () => {
    expect(teclaParaElElemento(input("range"), "ArrowLeft")).toBe(true);
    expect(teclaParaElElemento(input("range"), " ")).toBe(false);
    expect(teclaParaElElemento(input("range"), "2")).toBe(false);
  });

  test("botones y el resto de la página usan los atajos", () => {
    expect(teclaParaElElemento({ tagName: "BUTTON" }, " ")).toBe(false);
    expect(teclaParaElElemento({ tagName: "BODY" }, "r")).toBe(false);
    expect(teclaParaElElemento(null, "r")).toBe(false);
  });

  test("Tab sigue navegando entre controles", () => {
    expect(esControl({ tagName: "BUTTON" })).toBe(true);
    expect(esControl(input("range"))).toBe(true);
    expect(esControl({ tagName: "BODY" })).toBe(false);
    expect(esControl({ tagName: "CANVAS" })).toBe(false);
  });
});
