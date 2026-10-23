import { describe, it, expect } from "vitest";
import { crearAleatorio, crearRuido, cuantizar, aVoltaje, mediaMovil, adquirir } from "./adc.js";

describe("ADC de 10 bits del Arduino Uno", () => {
  it("cuantiza con floor y recorta en 0 y 1023", () => {
    expect(cuantizar(0, 5)).toBe(0);
    expect(cuantizar(2.5, 5)).toBe(512);
    expect(cuantizar(4.999, 5)).toBe(1023);
    expect(cuantizar(5, 5)).toBe(1023);
    expect(cuantizar(7, 5)).toBe(1023);
    expect(cuantizar(-1, 5)).toBe(0);
    expect(cuantizar(5 / 1024 - 1e-9, 5)).toBe(0);
    expect(cuantizar(5 / 1024 + 1e-9, 5)).toBe(1);
  });

  it("la conversión inversa recupera el voltaje dentro de 1 LSB", () => {
    for (const V of [0.3, 1.234, 2.5, 4.7]) {
      const error = V - aVoltaje(cuantizar(V, 5), 5);
      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThan(5 / 1024);
    }
  });
});

describe("media móvil con arreglo circular", () => {
  const datos = [3, 9, 1, 7, 7, 2, 10, 4, 6, 5, 8, 0];

  it("coincide con el promedio directo de las últimas N (o de las válidas al arrancar)", () => {
    for (const N of [1, 3, 5, 10]) {
      const filtrado = mediaMovil(datos, N);
      datos.forEach((_, i) => {
        const ventana = datos.slice(Math.max(0, i - N + 1), i + 1);
        const promedio = ventana.reduce((s, x) => s + x, 0) / ventana.length;
        expect(filtrado[i]).toBeCloseTo(promedio, 12);
      });
    }
  });

  it("con N = 1 no cambia la señal", () => {
    expect(Array.from(mediaMovil(datos, 1))).toEqual(datos);
  });

  it("en una rampa se atrasa exactamente (N - 1)/2 muestras", () => {
    const rampa = Array.from({ length: 50 }, (_, i) => 2 * i);
    for (const N of [3, 5, 10]) {
      const filtrado = mediaMovil(rampa, N);
      for (let i = N - 1; i < rampa.length; i++) expect(filtrado[i]).toBeCloseTo(2 * (i - (N - 1) / 2), 10);
    }
  });
});

describe("ruido con semilla", () => {
  it("la misma semilla da la misma secuencia y otra semilla una distinta", () => {
    const a = crearRuido(7);
    const b = crearRuido(7);
    const c = crearRuido(8);
    const sa = Array.from({ length: 20 }, a);
    expect(Array.from({ length: 20 }, b)).toEqual(sa);
    expect(Array.from({ length: 20 }, c)).not.toEqual(sa);
  });

  it("el uniforme está en [0, 1) y el normal tiene media 0 y desviación 1", () => {
    const u = crearAleatorio(3);
    const n = crearRuido(3);
    let suma = 0;
    let suma2 = 0;
    const total = 40000;
    for (let i = 0; i < total; i++) {
      const x = u();
      expect(x >= 0 && x < 1).toBe(true);
      const z = n();
      suma += z;
      suma2 += z * z;
    }
    expect(Math.abs(suma / total)).toBeLessThan(0.02);
    expect(Math.sqrt(suma2 / total)).toBeCloseTo(1, 1);
  });
});

describe("adquisición", () => {
  const dt = 1e-4;
  const senoidal = Float64Array.from({ length: 10001 }, (_, k) => 2.5 + 3 * Math.sin(2 * Math.PI * 5 * k * dt));

  it("toma una muestra cada Ts desde t = 0", () => {
    const { t, n } = adquirir(senoidal, dt, { Ts: 2e-3 });
    expect(n).toBe(501);
    expect(t[0]).toBe(0);
    expect(t[1]).toBeCloseTo(2e-3, 15);
    expect(t[n - 1]).toBeCloseTo(1, 12);
  });

  it("sin ruido, cada código es el de la señal en ese instante", () => {
    const { t, codigo } = adquirir(senoidal, dt, { Ts: 2e-3 });
    for (let k = 0; k < t.length; k += 37) {
      expect(codigo[k]).toBe(cuantizar(2.5 + 3 * Math.sin(2 * Math.PI * 5 * t[k]), 5));
    }
  });

  it("cuenta las muestras recortadas (la señal pasa de 0 a 5 V)", () => {
    const { codigo, saturadas } = adquirir(senoidal, dt, { Ts: 2e-3 });
    const recortadas = codigo.filter((c) => c === 0 || c === 1023).length;
    expect(saturadas).toBe(recortadas);
    expect(saturadas).toBeGreaterThan(100);
  });

  it("es reproducible con la misma semilla", () => {
    const opciones = { Ts: 2e-3, sigma_ruido: 2, jitter: 1e-4, N_filtro: 5, semilla: 11 };
    const a = adquirir(senoidal, dt, opciones);
    const b = adquirir(senoidal, dt, opciones);
    expect(Array.from(b.filtrado)).toEqual(Array.from(a.filtrado));
    expect(Array.from(b.t)).toEqual(Array.from(a.t));
  });
});
