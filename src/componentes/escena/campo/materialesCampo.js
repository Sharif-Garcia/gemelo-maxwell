/*
 * Shaders del campo: las líneas (trazos que avanzan en el sentido de B, color por |B|) y el mapa
 * de calor (combina dos rejillas base en el plano de corte). Ambos usan la misma rampa y la misma
 * escala logarítmica (rampa.js) y descartan lo que queda bajo el tapete.
 */
import { Color, DoubleSide, ShaderMaterial } from "three";
import { RAMPA_AZUL } from "./rampa.js";

const N = RAMPA_AZUL.length;

// Colores de la rampa en el espacio lineal de trabajo (Color convierte desde sRGB)
const coloresRampa = () => RAMPA_AZUL.map((hex) => new Color(hex));

const GLSL_RAMPA = /* glsl */ `
  uniform vec3 uRampa[${N}];
  uniform float uLogMin;
  uniform float uLogMax;
  vec3 rampa(float t) {
    float x = clamp(t, 0.0, 1.0) * float(${N - 1});
    int i = int(min(floor(x), float(${N - 2})));
    vec3 a = uRampa[0];
    vec3 b = uRampa[1];
    for (int k = 0; k < ${N - 1}; k++) {
      if (k == i) { a = uRampa[k]; b = uRampa[k + 1]; }
    }
    return mix(a, b, x - float(i));
  }
  float posicionEscala(float logB) {
    return clamp((logB - uLogMin) / (uLogMax - uLogMin), 0.0, 1.0);
  }
`;

/*
 * Líneas: atributos `arco` (cm a lo largo de la línea, en el sentido de B) y `logB` (log10 |B| de
 * referencia). uLogFactor escala el campo en el tiempo (Hito 2) y uTiempo desplaza los trazos.
 */
export function crearMaterialLineas() {
  return new ShaderMaterial({
    uniforms: {
      uRampa: { value: coloresRampa() },
      uLogMin: { value: -3 },
      uLogMax: { value: 0 },
      uLogFactor: { value: 0 },
      uTiempo: { value: 0 },
      uPaso: { value: 1.2 },
      uOpacidad: { value: 0.9 },
      uAlturaMin: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float arco;
      attribute float logB;
      varying float vArco;
      varying float vLogB;
      varying float vAltura;
      void main() {
        vArco = arco;
        vLogB = logB;
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vAltura = mundo.y;
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_RAMPA}
      uniform float uLogFactor;
      uniform float uTiempo;
      uniform float uPaso;
      uniform float uOpacidad;
      uniform float uAlturaMin;
      varying float vArco;
      varying float vLogB;
      varying float vAltura;
      void main() {
        if (vAltura < uAlturaMin) discard;
        float t = posicionEscala(vLogB + uLogFactor);
        float fase = fract((vArco - uTiempo) / uPaso);
        float trazo = smoothstep(0.0, 0.12, fase) * (1.0 - smoothstep(0.5, 0.62, fase));
        float alfa = uOpacidad * mix(0.35, 1.0, trazo) * mix(0.3, 1.0, t);
        gl_FragColor = vec4(rampa(t), alfa);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

/*
 * Mapa de calor del plano de corte: dos rejillas base (RG = Brho, Bz en mT por unidad de fuente)
 * combinadas como uI·base1 + uM·base2. vUv.x recorre de -rhoMax a +rhoMax y vUv.y de zMin a zMax;
 * |B| es par en rho, así que se lee la rejilla con |rho|.
 */
export function crearMaterialMapa(base1, base2, tamano) {
  return new ShaderMaterial({
    uniforms: {
      uRampa: { value: coloresRampa() },
      uLogMin: { value: -3 },
      uLogMax: { value: 0 },
      uBase1: { value: base1 },
      uBase2: { value: base2 },
      uTamano: { value: tamano },
      uI: { value: 1 },
      uM: { value: 0 },
      uOpacidad: { value: 0.85 },
      uAlturaMin: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vAltura;
      void main() {
        vUv = uv;
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vAltura = mundo.y;
        gl_Position = projectionMatrix * viewMatrix * mundo;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_RAMPA}
      uniform sampler2D uBase1;
      uniform sampler2D uBase2;
      uniform vec2 uTamano;
      uniform float uI;
      uniform float uM;
      uniform float uOpacidad;
      uniform float uAlturaMin;
      varying vec2 vUv;
      varying float vAltura;
      void main() {
        if (vAltura < uAlturaMin) discard;
        // Centro de los texeles: el nodo i de la rejilla está en (i + 0.5)/n
        vec2 nodo = vec2(abs(vUv.x * 2.0 - 1.0), vUv.y) * (uTamano - 1.0);
        vec2 coordenada = (nodo + 0.5) / uTamano;
        vec2 b = texture2D(uBase1, coordenada).rg * uI + texture2D(uBase2, coordenada).rg * uM;
        float magnitud = length(b) * 1e-3;   // de mT a T
        float t = posicionEscala(log(max(magnitud, 1e-12)) / log(10.0));
        gl_FragColor = vec4(rampa(t), uOpacidad * smoothstep(0.02, 0.4, t));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}
