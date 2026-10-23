# Gemelo digital de las leyes de Maxwell

Gemelo digital 3D, interactivo y sincronizado, de los dos montajes de la guía *Validación experimental de las leyes de Maxwell (Faraday-Lenz y Ampère)*:

- **Hito 1, Faraday-Lenz (radar inductivo):** un imán de neodimio cae por un tubo y atraviesa una bobina. La bobina va entre una referencia de 2.5 V y el pin A0 de un Arduino Uno, que muestrea la FEM inducida cada 2 ms.
- **Hito 2, Ampère (electroimán):** un solenoide sobre un perno de hierro dulce, conmutado por PWM desde D9 con un TIP120 y un diodo flyback 1N4007. Un sensor Hall SS49E frente al núcleo mide B en A1. En el boceto de la guía este elemento aparece como un motor.

La escena, el campo magnético, las gráficas y los valores en vivo leen una sola simulación de cada hito. Ningún componente calcula física por su cuenta.

Proyecto de la asignatura **Modelado y Simulación** · Universidad Popular del Cesar · Docente: Andrés Perpiñán Reyes.

**Autora:** Sharif Alejandra García Toledo.

## Qué incluye

- **Escena 3D a escala real** (1 unidad = 1 cm):
  - Comunes: Arduino Uno y protoboard de 830 puntos con cables DuPont, según un netlist verificado contra el circuito de la guía.
  - Hito 1: soporte universal con tubo de acrílico, bobina devanada capa por capa e imán que cae.
  - Hito 2: perno con solenoide, TIP120, diodo, SS49E y fuente de 12 V.
- **Campo magnético visible:**
  - Líneas de campo animadas, mapa de calor de |B| en un plano de corte, flechas y brújulas.
  - En el Hito 1 el campo es el del imán. En el Hito 2 es el del solenoide más el de la magnetización del núcleo.
- **Gráficas sincronizadas con uPlot:**
  - Hito 1: x y v, flujo, FEM ideal contra medida en A0, lectura del ADC, integral acumulada, filtros N = 1, 3, 5 y 10, y pico y Δt contra la velocidad.
  - Hito 2: barrido D e I, B_s, V_hall, lectura de A1, "B contra D" con su regresión y un periodo del PWM.
- **Parámetros** con deslizador y campo numérico, y escenarios típicos. La simulación se recalcula sin reiniciar.
- **Avisos:** ADC saturado, sensor o núcleo saturado, ausencia del diodo flyback y corriente que supera a la fuente.
- **"PWM lento":** recorre un periodo del PWM a 0.001×. Se ven la conmutación del transistor, la descarga por el diodo y el rizado de la corriente.
- **Modo análisis (tecla A):**
  - En la escena: tensión de cada nodo, cotas, el sentido de Lenz, partículas de corriente, el diodo que se ilumina al conducir y las flechas de H, M y B.
  - En el panel: la ley de cada hito evaluada en el instante y las preguntas 1 a 4 del taller con los números del gemelo.
- **Validación con el Arduino:**
  - Carga del CSV real (`Tiempo,Voltaje` o `CicloTrabajo_PWM,Voltaje_Hall`) y superposición de las curvas medidas.
  - Ajuste por mínimos cuadrados de la velocidad, el instante de cruce y la polaridad (Hito 1).
  - Tabla de errores porcentuales y RMS, lista para copiar al informe.
- **Exportación:** CSV del gemelo y captura PNG de la escena en 1920 × 1080.
- **Presentación y ayuda:** modo presentación (tecla P), ayuda (tecla H) y calidad automática en equipos lentos.

## Modelo físico

Todo el motor (`src/fisica/`) trabaja en SI y no depende de three.js ni de React.

**Campo de una bobina o de un imán.** Una lámina cilíndrica de corriente (radio a, largo 2b, densidad K) tiene campo exacto con la integral elíptica completa generalizada (`cel` de Bulirsch). Con esa lámina se modelan:

- el imán, con K = Br/μ0;
- cada capa de los devanados;
- el núcleo magnetizado, con K = M.

**Hito 1.** El flujo enlazado se calcula espira por espira con la inductancia mutua exacta y se tabula en x:

```
ε(t) = −N dΦ₁/dt = −pol · dΦ_bob/dx(x) · v
V_A0 = V_ref + ε                         (V_ref = 2.5 V)
caída libre:  x = x0 + g·t²/2,  v = g·t
```

El Arduino muestrea V_A0 cada 2 ms. El modelo del ADC es de 10 bits, con ruido gaussiano de 0.5 LSB y una media móvil de N muestras en un arreglo circular. La integral neta ∫ε dt = −(Φ_fin − Φ_ini) tiende a cero (pregunta 1).

**Hito 2.**

- **PWM:** el Timer1 del Uno en modo de fase correcta da 490.2 Hz en D9, con 510 tics por periodo; un valor v de `analogWrite` deja 2v tics encendido.
- **Circuito RL:** se integra por RK4 hasta el régimen periódico.

```
encendido:  L·di/dt = V_fuente − V_CE,sat − (R_bob + R_fuente)·i
apagado:    L·di/dt = −(R_bob·i + V_f)          (descarga por el diodo)
H = h·I,   χ_a = χ / (1 + N_d·χ),   M = M(H) con saturación de Fröhlich-Kennelly
B_s = I·b_bob + M·b_nuc,   V_hall = V_q + S·B   (S = 14 mV/mT, recortado a 0.86–4.21 V)
```

- **Lectura del Arduino:** en cada paso del barrido (de 10 en 10 % cada segundo) promedia 50 lecturas del Hall en fases distintas del PWM. Con esos promedios se calculan la regresión de B contra D y la causa de la pérdida de linealidad: sensor, núcleo o circuito (pregunta 4).

### Valores de referencia (parámetros por defecto)

| Hito 1: bobina de 200 espiras, AWG 28, imán N42 de 12 × 10 mm cayendo desde 100 mm | Valor |
|---|---|
| Velocidad al cruzar el centro | 1.40 m/s |
| Pico de entrada / salida | 1.013 V / −1.111 V |
| Δt entre picos | 13.20 ms |
| ∫ε dt frente a ∫\|ε\| dt | −0.0107 mV·s frente a 22.69 mV·s |

| Hito 2: 120 espiras AWG 26 sobre perno de 5/16" × 50 mm, sensor a 3 mm | Valor |
|---|---|
| Corriente encendido, inductancia | 1.051 A, 1.75 mH |
| B_s y V_hall al 100 % | 14.38 mT, 2.701 V |
| Pendiente y R² de B contra D | 0.1234 mT/%, 0.841 |
| M/Ms máximo | 3.6 % (el núcleo no se satura) |
| Causa de la curvatura | el circuito: el diodo mantiene la corriente y la fuente la limita |

## Validación con el Arduino

En el panel **Validación con el Arduino**, a la derecha de las gráficas, se arrastra o se elige el CSV que imprime el Arduino:

- **Formato:** coma, punto y coma o tabulador; el voltaje en V o en código ADC; el tiempo en ms o µs; el ciclo de 0 a 255 o en %. El lector salta las líneas START y STOP.
- **Ajuste del Hito 1:** "Ajustar el pulso" encuentra la velocidad en el centro, el instante de cruce y la polaridad. "Aplicar al gemelo" lleva ese ajuste a los parámetros.
- **Tabla de errores:** compara picos, Δt, área del pulso e integral (Hito 1), o pendiente, R², B y V_hall (Hito 2). Da el error porcentual de cada magnitud y el RMS punto a punto.
- **Para el informe:** "Copiar tabla para el informe" la deja lista para pegar en Word o en una hoja de cálculo.

"Cargar ejemplo sintético" carga datos generados por el propio gemelo con otros parámetros. Sirven para probar el flujo y no reemplazan una medición real.

## Ejecución

Requisitos: [Node.js](https://nodejs.org) 20 o más reciente y un navegador con WebGL 2 (Chrome, Edge o Firefox recientes).

```bash
git clone https://github.com/Sharif-Garcia/gemelo-maxwell.git
cd gemelo-maxwell
npm install        # instala las dependencias (una sola vez)
npm run dev        # abre el gemelo en http://localhost:5173
```

Otros comandos:

```bash
npm test           # pruebas (vitest)
npm run lint       # revisión del código (oxlint)
npm run build      # versión de producción en dist/
npm run preview    # sirve dist/ para revisarla
```

Al abrirlo empieza en el Hito 1 con la caída libre. Con **Tab** o el selector de arriba a la izquierda se cambia al Hito 2, y con **Espacio** se reproduce.

### Atajos de teclado

| Tecla | Acción |
|---|---|
| Espacio | Reproducir / pausar |
| R | Reiniciar |
| ← → | Paso manual (en pausa) |
| 1 a 5 | Vistas de cámara |
| Tab | Cambiar de hito |
| A | Estudio / Análisis |
| C | Líneas de campo |
| P | Modo presentación |
| H o ? | Ayuda |
| Esc | Cerrar la ayuda o salir de la presentación |
| F | Medidor de cuadros por segundo |

## Pruebas

Las pruebas automáticas (vitest) cubren:

- **Física:**
  - Las integrales elípticas contra la media aritmético-geométrica y la integral directa.
  - El campo de una lámina: fórmula exacta en el eje, solenoide largo (μ0·K), límite dipolar, ley de Ampère en un lazo, divergencia y rotacional nulos, y simetrías.
  - La inductancia mutua: simetría, flujo de una espira y límite lejano.
- **Hito 1:** Faraday con ∫ε dt = −ΔΦ; la comparación con el modelo dipolo; el ADC, el filtro y la saturación.
- **Hito 2:** el periodo PWM en régimen, el promedio de la corriente, la saturación del sensor y del núcleo, y la regresión.
- **Escena, interfaz y datos:** el netlist contra el circuito de la guía, el estado, los atajos, la lectura de CSV, el ajuste, la validación y los números del modo análisis.

## Estructura

```
src/
  fisica/        motor puro: campo, bobina, faraday, ampere, adc, regresión, líneas de campo
  estado/        usarGemelo (zustand), parámetros, escenarios, avisos
  geometria/     posiciones puras: Arduino, protoboard, netlist, cables, montajes
  analisis/      números del modo análisis y acomodo de etiquetas
  graficas/      variables, pestañas y series de las gráficas
  utilidades/    CSV, ajuste, validación, ejemplos y descargas
  componentes/
    escena/      estudio, cámaras, piezas de cada hito, campo magnético y modo análisis
    ui/          paneles, gráficas, validación, ayuda y pantalla de carga
  hooks/         reloj de reproducción y atajos
  trabajadores/  trazado de líneas de campo fuera del hilo principal
```

## Limitaciones

- El imán y el núcleo se modelan con magnetización uniforme; el núcleo real se magnetiza más en el centro que en los extremos.
- No hay frenado magnético del imán (el circuito es de alta impedancia), ni rozamiento con el tubo, ni histéresis o corrientes parásitas en el núcleo.
- El ADC se modela ideal (sin no linealidad integral) más ruido gaussiano.
- La fuente es un modelo de Thévenin. Un adaptador real puede entrar en protección con un solenoide de unos 0.5 Ω.
- Las velocidades de las partículas de corriente del modo análisis son visuales, no la velocidad de deriva.

## Tecnologías

Vite, React 19, three.js, React Three Fiber, drei, postprocessing, zustand, uPlot, Tailwind CSS y vitest.
