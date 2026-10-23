/*
 * Adquisición con el Arduino Uno (ambos hitos). CLAUDE.md, "Adquisición".
 *
 * - Generador con semilla (mulberry32) y ruido gaussiano (Box-Muller): nunca Math.random.
 * - ADC de 10 bits con referencia V_cc: codigo = clamp(floor(V·2^bits/V_cc), 0, 2^bits - 1).
 * - Muestreo no bloqueante con millis(): una muestra cada Ts.
 * - Media móvil con arreglo circular, igual que en el firmware.
 */

// Generador uniforme en [0, 1) reproducible por semilla
export function crearAleatorio(semilla) {
  let estado = semilla >>> 0;
  return function siguiente() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generador normal estándar (media 0, desviación 1) reproducible por semilla
export function crearRuido(semilla) {
  const uniforme = crearAleatorio(semilla);
  let guardado = null;
  return function normal() {
    if (guardado !== null) {
      const z = guardado;
      guardado = null;
      return z;
    }
    const u1 = 1 - uniforme();   // en (0, 1]: evita log(0)
    const u2 = uniforme();
    const radio = Math.sqrt(-2 * Math.log(u1));
    guardado = radio * Math.sin(2 * Math.PI * u2);
    return radio * Math.cos(2 * Math.PI * u2);
  };
}

export function cuantizar(V, V_cc, bits = 10) {
  const maximo = 2 ** bits - 1;
  return Math.min(maximo, Math.max(0, Math.floor((V * 2 ** bits) / V_cc)));
}

export function aVoltaje(codigo, V_cc, bits = 10) {
  return (codigo * V_cc) / 2 ** bits;
}

/*
 * Media móvil de N muestras con arreglo circular. Mientras el arreglo no está lleno se divide
 * por las muestras válidas (no arranca desde cero). Latencia de (N - 1)/2 muestras.
 */
export function mediaMovil(valores, N) {
  const salida = new Float64Array(valores.length);
  const arreglo = new Float64Array(N);
  let indice = 0;
  let llenas = 0;
  let suma = 0;
  for (let i = 0; i < valores.length; i++) {
    suma += valores[i] - arreglo[indice];   // sale la más vieja, entra la nueva
    arreglo[indice] = valores[i];
    indice = (indice + 1) % N;
    if (llenas < N) llenas++;
    salida[i] = suma / llenas;
  }
  return salida;
}

// Interpolación lineal de una serie uniforme (t0 = 0, paso dt) en el instante t
function interpolarUniforme(serie, dt, t) {
  const pos = t / dt;
  const k = Math.min(serie.length - 2, Math.max(0, Math.floor(pos)));
  const f = Math.min(1, Math.max(0, pos - k));
  return serie[k] + f * (serie[k + 1] - serie[k]);
}

/*
 * Muestrea una señal continua (serie uniforme de paso dt que empieza en t = 0) como lo haría el
 * Arduino: una lectura cada Ts (más un retardo aleatorio de hasta `jitter` s), ruido de
 * sigma_ruido LSB, cuantización y media móvil de N_filtro.
 */
export function adquirir(senal, dt, {
  Ts, V_cc = 5, bits = 10, sigma_ruido = 0, jitter = 0, N_filtro = 1, semilla = 1,
}) {
  const duracion = (senal.length - 1) * dt;
  const n = Math.floor(duracion / Ts + 1e-9) + 1;
  const lsb = V_cc / 2 ** bits;
  const maximo = 2 ** bits - 1;
  const ruido = crearRuido(semilla);
  const retardo = crearAleatorio(semilla ^ 0x9e3779b9);

  const t = new Float64Array(n);
  const codigo = new Float64Array(n);
  let saturadas = 0;
  for (let k = 0; k < n; k++) {
    t[k] = Math.min(duracion, k * Ts + jitter * retardo());
    const V = interpolarUniforme(senal, dt, t[k]) + sigma_ruido * lsb * ruido();
    codigo[k] = cuantizar(V, V_cc, bits);
    if (codigo[k] === 0 || codigo[k] === maximo) saturadas++;
  }
  return { t, codigo, filtrado: mediaMovil(codigo, N_filtro), saturadas, n };
}
