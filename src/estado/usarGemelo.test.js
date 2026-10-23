import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { usarGemelo, duracion, RETARDO_RECALCULO_MS, VELOCIDADES } from "./usarGemelo.js";
import { ejemploHito1, ejemploHito2 } from "../utilidades/ejemplos.js";

const estado = () => usarGemelo.getState();

beforeEach(() => {
  usarGemelo.setState(usarGemelo.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("arranque", () => {
  it("empieza en el Hito 1 con su escenario por defecto y el Hito 2 guardado", () => {
    const s = estado();
    expect(s.hito).toBe(1);
    expect(s.escenario).toBe("caida");
    expect(s.sim.p.N).toBe(200);
    expect(s.velocidad).toBe(0.05);
    expect(s.guardados[2].escenario).toBe("estandar");
    expect(s.guardados[2].sim.pasos).toHaveLength(11);
  });
});

describe("cambio de hito", () => {
  it("conserva parámetros, escenario y tiempo de cada hito", () => {
    estado().aplicarEscenario("rapido");
    estado().irA(0.02);
    estado().setHito(2);
    expect(estado().hito).toBe(2);
    expect(estado().escenario).toBe("estandar");
    expect(estado().t).toBe(0);
    expect(estado().velocidad).toBe(1);

    estado().irA(4.5);
    estado().setHito(1);
    expect(estado().escenario).toBe("rapido");
    expect(estado().t).toBeCloseTo(0.02, 12);
    expect(estado().parametros.v).toBe(3);

    estado().setHito(2);
    expect(estado().t).toBeCloseTo(4.5, 12);
  });

  it("pausa la reproducción al cambiar", () => {
    estado().play();
    estado().setHito(2);
    expect(estado().reproduciendo).toBe(false);
    estado().setHito(1);
    expect(estado().reproduciendo).toBe(false);
  });
});

describe("parámetros", () => {
  it("setParametro acota, marca Personalizado y recalcula con retardo", () => {
    vi.useFakeTimers();
    const antes = estado().sim;
    estado().setParametro("N", 1234);
    expect(estado().parametros.N).toBe(400);
    expect(estado().escenario).toBeNull();
    expect(estado().sim).toBe(antes);
    vi.advanceTimersByTime(RETARDO_RECALCULO_MS);
    expect(estado().sim).not.toBe(antes);
    expect(estado().sim.p.N).toBe(400);
  });

  it("corrige los dependientes (capas <= N)", () => {
    estado().setParametro("N", 20);
    estado().setParametro("capas", 8);
    estado().setParametro("N", 20);
    expect(estado().parametros.capas).toBeLessThanOrEqual(8);
    estado().recalcular();
    expect(estado().errorSimulacion).toBeNull();
  });

  it("si el motor rechaza los parámetros conserva la simulación anterior", () => {
    const antes = estado().sim;
    usarGemelo.setState({ parametros: { ...estado().parametros, grado: "N99" } });
    estado().recalcular();
    expect(estado().sim).toBe(antes);
    expect(estado().errorSimulacion).toMatch(/imán/);
  });

  it("restablecerTodo vuelve al escenario por defecto del hito activo", () => {
    estado().setHito(2);
    estado().setParametro("d_sensor", 7e-3);
    estado().restablecerTodo();
    expect(estado().escenario).toBe("estandar");
    expect(estado().parametros.d_sensor).toBe(3e-3);
  });

  it("recalcular conserva el tiempo dentro de la nueva duración", () => {
    estado().irA(0.2);
    estado().aplicarEscenario("saturacion-adc");   // reinicia a 0
    expect(estado().t).toBe(0);
    estado().irA(0.05);
    usarGemelo.setState({ parametros: { ...estado().parametros, v: 6 } });
    estado().recalcular();
    expect(estado().t).toBeLessThanOrEqual(duracion(estado().sim));
  });
});

describe("cámara lenta del PWM", () => {
  it("solo existe en el Hito 2", () => {
    estado().alternarCamaraLentaPWM();
    expect(estado().camaraLentaPWM).toBe(false);
  });

  it("pausa el barrido y recorre el periodo a 0.001×", () => {
    estado().setHito(2);
    estado().irA(5.5);
    estado().play();
    estado().alternarCamaraLentaPWM();
    expect(estado().camaraLentaPWM).toBe(true);
    expect(estado().reproduciendo).toBe(false);
    estado().avanzar(1);   // 1 s real = 1 ms de fase
    expect(estado().fasePWM).toBeCloseTo(1e-3, 12);
    expect(estado().t).toBeCloseTo(5.5, 12);
    estado().avanzar(1.5);   // da la vuelta al periodo de 2.04 ms
    expect(estado().fasePWM).toBeCloseTo(2.5e-3 - estado().sim.d.T_PWM, 12);
  });

  it("reproducir o cambiar de hito la apaga", () => {
    estado().setHito(2);
    estado().alternarCamaraLentaPWM();
    estado().play();
    expect(estado().camaraLentaPWM).toBe(false);
    estado().alternarCamaraLentaPWM();
    estado().alternarHito();
    expect(estado().hito).toBe(1);
    expect(estado().camaraLentaPWM).toBe(false);
  });
});

describe("reloj", () => {
  it("avanza según la velocidad y se detiene al final", () => {
    const s = estado();
    s.play();
    s.avanzar(0.1);   // 0.1 s reales a 0.05x
    expect(estado().t).toBeCloseTo(0.005, 12);
    estado().avanzar(1e3);
    expect(estado().t).toBe(duracion(estado().sim));
    expect(estado().reproduciendo).toBe(false);
  });

  it("con bucle vuelve a empezar", () => {
    estado().setBucle(true);
    estado().play();
    const tf = duracion(estado().sim);
    estado().irA(tf - 0.001);
    estado().avanzar(0.04);   // 0.002 s simulados
    expect(estado().t).toBeCloseTo(0.001, 9);
    expect(estado().reproduciendo).toBe(true);
  });

  it("irA acota el tiempo y el índice", () => {
    expect(estado().irA(-1)).toBe(0);
    expect(estado().irA(1e9)).toBe(estado().sim.Nt - 1);
  });

  it("solo acepta las velocidades del hito activo", () => {
    estado().setVelocidad(4);
    expect(estado().velocidad).toBe(0.05);
    estado().setVelocidad(VELOCIDADES[1][0]);
    expect(estado().velocidad).toBe(0.01);
  });

  it("las flechas avanzan solo en pausa", () => {
    estado().pasoManual(1);
    expect(estado().t).toBeCloseTo(0.5e-3, 12);
    estado().play();
    estado().pasoManual(1);
    expect(estado().t).toBeCloseTo(0.5e-3, 12);
  });

  it("al terminar, play vuelve a empezar desde 0", () => {
    estado().irA(1e9);
    estado().play();
    expect(estado().t).toBe(0);
    expect(estado().reproduciendo).toBe(true);
  });
});

describe("medición del Arduino", () => {
  it("carga el CSV del hito activo y guarda los errores si no es válido", () => {
    estado().cargarMedicion("Tiempo,Voltaje\n0,abc\n2,2.5", "malo.csv");
    expect(estado().medicion).toBeNull();
    expect(estado().erroresMedicion[0]).toMatch(/Fila 2/);
    estado().cargarMedicion(ejemploHito1(), "ejemplo.csv");
    expect(estado().erroresMedicion).toBeNull();
    expect(estado().medicion.nombre).toBe("ejemplo.csv");
    expect(estado().medicion.datos.hito).toBe(1);
    estado().quitarMedicion();
    expect(estado().medicion).toBeNull();
  });

  it("cada hito conserva su medición", () => {
    estado().cargarMedicion(ejemploHito1(), "h1.csv");
    estado().setHito(2);
    expect(estado().medicion).toBeNull();
    estado().cargarMedicion(ejemploHito2(), "h2.csv");
    expect(estado().medicion.datos.hito).toBe(2);
    estado().setHito(1);
    expect(estado().medicion.nombre).toBe("h1.csv");
  });

  it("el ajuste se aplica a x0 y pol de una vez y recalcula", () => {
    estado().cargarMedicion(ejemploHito1(), "ejemplo.csv");
    estado().ajustarMedicion();
    const { ajuste } = estado().medicion;
    expect(ajuste.ok).toBe(true);
    estado().aplicarAjuste();
    expect(estado().parametros.x0).toBeCloseTo(-0.12, 3);
    expect(estado().sim.p.x0).toBe(estado().parametros.x0);
    expect(estado().escenario).toBeNull();
  });
});

describe("ayuda y presentación", () => {
  it("Escape cierra primero la ayuda y después sale de la presentación", () => {
    estado().alternarPresentacion();
    estado().alternarAyuda();
    estado().escape();
    expect(estado().ayuda).toBe(false);
    expect(estado().presentacion).toBe(true);
    estado().escape();
    expect(estado().presentacion).toBe(false);
  });
});
