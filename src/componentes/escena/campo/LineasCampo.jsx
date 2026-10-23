/* Líneas de campo en 3D: cada línea del semiplano meridional se replica en nPlanos planos
   alrededor del eje y todo se dibuja como una sola malla de tubos (una llamada de dibujo). El
   shader anima trazos en el sentido de B y los colorea por |B|; los uniformes de intensidad y
   tiempo se actualizan en useFrame, sin renders de React. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { crearMaterialLineas } from "./materialesCampo.js";
import { ALTO_TAPETE } from "../../../geometria/mesa.js";

const RADIO_TUBO = 0.022;    // cm
const LADOS = 5;
const VELOCIDAD = 1.6;       // cm/s de los trazos con intensidad 1

// Un tubo por línea y plano, con los atributos `arco` (cm) y `logB` por vértice
function tuboDeLinea(linea, marco, phi) {
  const n = linea.rho.length;
  const puntos = [];
  const arco = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    puntos.push(new Vector3(...marco.aEscena(linea.rho[i], linea.z[i], phi)));
    if (i > 0) arco[i] = arco[i - 1] + puntos[i].distanceTo(puntos[i - 1]);
  }
  const segmentos = n - 1;
  const geometria = new TubeGeometry(new CatmullRomCurve3(puntos, false, "centripetal"), segmentos, RADIO_TUBO, LADOS, false);
  // TubeGeometry reparte sus anillos de forma uniforme en longitud de arco (getPointAt), no uno
  // por punto: cada anillo toma su arco y su |B| interpolando en la longitud acumulada
  const largo = arco[n - 1];
  const total = geometria.attributes.position.count;
  const atributoArco = new Float32Array(total);
  const atributoLogB = new Float32Array(total);
  let j = 1;
  for (let anillo = 0; anillo <= segmentos; anillo++) {
    const s = (anillo / segmentos) * largo;
    while (j < n - 1 && arco[j] < s) j++;
    const f = arco[j] > arco[j - 1] ? Math.min(1, Math.max(0, (s - arco[j - 1]) / (arco[j] - arco[j - 1]))) : 0;
    const B = linea.B[j - 1] + f * (linea.B[j] - linea.B[j - 1]);
    for (let lado = 0; lado <= LADOS; lado++) {
      const v = anillo * (LADOS + 1) + lado;
      atributoArco[v] = s;
      atributoLogB[v] = Math.log10(Math.max(B, 1e-12));
    }
  }
  geometria.setAttribute("arco", new BufferAttribute(atributoArco, 1));
  geometria.setAttribute("logB", new BufferAttribute(atributoLogB, 1));
  return geometria;
}

/*
 * lineas: resultado de trazarLineas (SI); marco: marcoCampo (cm); escala: [log10 min, log10 max];
 * intensidad(): factor del campo en el instante actual (se llama en cada cuadro).
 */
export default function LineasCampo({ lineas, marco, nPlanos, escala, intensidad }) {
  // Material creado una sola vez; sus uniformes se cambian a través de la malla
  const [material] = useState(crearMaterialLineas);
  const malla = useRef(null);
  const geometria = useMemo(() => {
    if (!lineas?.length) return null;
    const tubos = [];
    for (let k = 0; k < nPlanos; k++) {
      const phi = (2 * Math.PI * k) / nPlanos;
      for (const linea of lineas) if (linea.rho.length > 2) tubos.push(tuboDeLinea(linea, marco, phi));
    }
    const unida = mergeGeometries(tubos);
    tubos.forEach((t) => t.dispose());
    return unida;
  }, [lineas, marco, nPlanos]);
  const tiempo = useRef(0);

  useEffect(() => () => geometria?.dispose(), [geometria]);

  useFrame((_, dt) => {
    const u = malla.current?.material.uniforms;
    if (!u) return;
    const f = intensidad();
    tiempo.current += Math.min(dt, 0.1) * VELOCIDAD * Math.min(1.5, f);
    u.uLogMin.value = escala[0];
    u.uLogMax.value = escala[1];
    u.uAlturaMin.value = ALTO_TAPETE;
    u.uTiempo.value = tiempo.current;
    u.uLogFactor.value = Math.log10(Math.max(f, 1e-6));
    u.uOpacidad.value = f > 0.01 ? 0.25 + 0.65 * Math.min(1, f) : 0;
  });

  if (!geometria) return null;
  return <mesh ref={malla} geometry={geometria} material={material} renderOrder={2} />;
}
