/* Mapa de calor de |B| en el plano de corte que contiene el eje (phi = 0 y phi = π). Las dos
   rejillas base (crearRejilla, en el marco del motor) se suben como texturas de media precisión en
   mT y el shader las combina con los uniformes uI y uM, que se actualizan en cada cuadro.
   El padre lo remonta (key) cuando cambian las rejillas o el plano. */
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, DataTexture, DataUtils, HalfFloatType, LinearFilter, RGFormat, Vector2 } from "three";
import { crearMaterialMapa } from "./materialesCampo.js";
import { ALTO_TAPETE } from "../../../geometria/mesa.js";

// Rejilla { nRho, nZ, Brho, Bz } [T por unidad] → textura RG en mT por unidad × escala
function texturaDeRejilla(rejilla, escala) {
  const { nRho, nZ, Brho, Bz } = rejilla;
  const datos = new Uint16Array(nRho * nZ * 2);
  for (let k = 0; k < nRho * nZ; k++) {
    datos[2 * k] = DataUtils.toHalfFloat(Brho[k] * escala);
    datos[2 * k + 1] = DataUtils.toHalfFloat(Bz[k] * escala);
  }
  const textura = new DataTexture(datos, nRho, nZ, RGFormat, HalfFloatType);
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.needsUpdate = true;
  return textura;
}

// Plano de corte: x de textura de -rhoMax a +rhoMax, y de zMin a zMax (marco en cm)
function planoDeCorte(marco, { rhoMax, zMin, zMax }) {
  const esquina = (u, v) => {
    const rho = (2 * u - 1) * rhoMax;
    return marco.aEscena(Math.abs(rho), zMin + v * (zMax - zMin), rho < 0 ? Math.PI : 0);
  };
  const geometria = new BufferGeometry();
  geometria.setAttribute("position", new BufferAttribute(new Float32Array([...esquina(0, 0), ...esquina(1, 0), ...esquina(1, 1), ...esquina(0, 1)]), 3));
  geometria.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  geometria.setIndex([0, 1, 2, 0, 2, 3]);
  return geometria;
}

function crearRecursos(marco, bases, limites) {
  const [b1, b2 = b1] = bases.map((b) => texturaDeRejilla(b.rejilla, b.escala));
  return {
    texturas: [b1, b2],
    material: crearMaterialMapa(b1, b2, new Vector2(bases[0].rejilla.nRho, bases[0].rejilla.nZ)),
    geometria: planoDeCorte(marco, limites),
  };
}

/*
 * bases: [{ rejilla, escala }] (una o dos; escala lleva T a mT por la unidad del uniforme);
 * limites: { rhoMax, zMin, zMax } de las rejillas [m]; fuente(): { I, M } en cada cuadro.
 */
export default function MapaCalor({ marco, bases, limites, escala, fuente }) {
  // Recursos creados una sola vez por montaje; los uniformes se cambian a través de la malla
  const [recursos] = useState(() => crearRecursos(marco, bases, limites));
  const malla = useRef(null);
  const dosBases = bases.length > 1;

  useEffect(() => () => {
    recursos.texturas.forEach((t) => t.dispose());
    recursos.material.dispose();
    recursos.geometria.dispose();
  }, [recursos]);

  useFrame(() => {
    const u = malla.current?.material.uniforms;
    if (!u) return;
    const { I, M } = fuente();
    u.uLogMin.value = escala[0];
    u.uLogMax.value = escala[1];
    u.uAlturaMin.value = ALTO_TAPETE;
    u.uI.value = I;
    u.uM.value = dosBases ? M : 0;
  });

  return <mesh ref={malla} geometry={recursos.geometria} material={recursos.material} renderOrder={1} />;
}
