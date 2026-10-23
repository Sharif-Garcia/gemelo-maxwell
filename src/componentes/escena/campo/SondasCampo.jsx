/* Flechas y brújulas en los puntos de sonda del plano de corte (geometria/marcoCampo.js). Las
   flechas apuntan en el sentido de B y se colorean por |B|; las brújulas giran la aguja (norte
   rojo) hacia B. `muestrear()` devuelve en cada cuadro la dirección y la posición en la escala
   de cada sonda; las matrices se actualizan sin renders de React. */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ConeGeometry, CylinderGeometry, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { colorRampa } from "./rampa.js";

const ARRIBA = new Vector3(0, 1, 0);
const auxiliar = new Object3D();
const direccion = new Vector3();
const color = new Color();

function geometriaFlecha() {
  const asta = new CylinderGeometry(0.03, 0.03, 0.45, 8);
  asta.translate(0, -0.1, 0);
  const punta = new ConeGeometry(0.1, 0.25, 12);
  punta.translate(0, 0.25, 0);
  return mergeGeometries([asta, punta]);
}

function geometriaMediaAguja(signo) {
  const cono = new ConeGeometry(0.075, 0.38, 10);
  if (signo < 0) cono.rotateZ(Math.PI);
  cono.translate(0, signo * 0.19, 0);
  return cono;
}

// Brújulas separadas al menos SEPARACION_BRUJULAS [cm] entre sí para no saturar la vista
const SEPARACION_BRUJULAS = 1.4;
function elegirBrujulas(puntos) {
  const elegidos = [];
  puntos.forEach((p, i) => {
    const lejos = elegidos.every((j) => Math.hypot(p[0] - puntos[j][0], p[1] - puntos[j][1], p[2] - puntos[j][2]) >= SEPARACION_BRUJULAS);
    if (lejos) elegidos.push(i);
  });
  return elegidos;
}

const MATERIAL_FLECHA = new MeshStandardMaterial({ roughness: 0.5 });
const MATERIAL_NORTE = new MeshStandardMaterial({ color: "#e34948", roughness: 0.45 });
const MATERIAL_SUR = new MeshStandardMaterial({ color: "#f2f1ec", roughness: 0.45 });
const MATERIAL_CARATULA = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false });

/*
 * puntos: posiciones de escena; normalPlano: normal del plano de corte (las carátulas de las
 * brújulas quedan en él); muestrear(): [{ x, y, z, t }] dirección unitaria y posición en la escala.
 */
export default function SondasCampo({ puntos, normalPlano, muestrear, flechas, brujulas }) {
  const geometrias = useMemo(() => ({
    flecha: geometriaFlecha(),
    norte: geometriaMediaAguja(1),
    sur: geometriaMediaAguja(-1),
    caratula: new CylinderGeometry(0.24, 0.24, 0.02, 24),
  }), []);
  const indicesBrujula = useMemo(() => elegirBrujulas(puntos), [puntos]);
  const refFlechas = useRef(null);
  const refNorte = useRef(null);
  const refSur = useRef(null);
  const refCaratula = useRef(null);

  // El color por instancia debe existir antes de que el material se compile por primera vez
  useLayoutEffect(() => {
    if (!refFlechas.current) return;
    for (let i = 0; i < puntos.length; i++) refFlechas.current.setColorAt(i, color.set("#ffffff"));
  }, [puntos, flechas]);

  // Las carátulas no giran: su eje es la normal del plano de corte
  useLayoutEffect(() => {
    if (!refCaratula.current) return;
    const giro = new Quaternion().setFromUnitVectors(ARRIBA, new Vector3(...normalPlano));
    indicesBrujula.forEach((i, k) => {
      auxiliar.position.set(...puntos[i]);
      auxiliar.quaternion.copy(giro);
      auxiliar.scale.set(1, 1, 1);
      auxiliar.updateMatrix();
      refCaratula.current.setMatrixAt(k, auxiliar.matrix);
    });
    refCaratula.current.instanceMatrix.needsUpdate = true;
  }, [puntos, normalPlano, indicesBrujula, brujulas]);

  useFrame(() => {
    const muestras = muestrear();
    if (!muestras) return;
    if (refFlechas.current) {
      muestras.forEach((m, i) => {
        auxiliar.position.set(...puntos[i]);
        auxiliar.quaternion.setFromUnitVectors(ARRIBA, direccion.set(m.x, m.y, m.z));
        // Donde el campo es despreciable la flecha desaparece
        const s = m.t > 0.04 ? 1 : 0;
        auxiliar.scale.set(s, s, s);
        auxiliar.updateMatrix();
        refFlechas.current.setMatrixAt(i, auxiliar.matrix);
        const [r, g, b] = colorRampa(m.t);
        refFlechas.current.setColorAt(i, color.setRGB(r / 255, g / 255, b / 255, "srgb"));
      });
      refFlechas.current.instanceMatrix.needsUpdate = true;
      if (refFlechas.current.instanceColor) refFlechas.current.instanceColor.needsUpdate = true;
    }
    if (refNorte.current) {
      indicesBrujula.forEach((i, k) => {
        const m = muestras[i];
        auxiliar.position.set(...puntos[i]);
        auxiliar.quaternion.setFromUnitVectors(ARRIBA, direccion.set(m.x, m.y, m.z));
        auxiliar.scale.set(1, 1, 1);
        auxiliar.updateMatrix();
        refNorte.current.setMatrixAt(k, auxiliar.matrix);
        refSur.current.setMatrixAt(k, auxiliar.matrix);
      });
      refNorte.current.instanceMatrix.needsUpdate = true;
      refSur.current.instanceMatrix.needsUpdate = true;
    }
  });

  // frustumCulled={false}: las matrices se llenan en useFrame, después de que three calcula la
  // esfera envolvente (que quedaría en el origen y descartaría las instancias)
  return (
    <group>
      {flechas && <instancedMesh ref={refFlechas} args={[geometrias.flecha, MATERIAL_FLECHA, puntos.length]} frustumCulled={false} castShadow />}
      {brujulas && (
        <>
          <instancedMesh ref={refCaratula} args={[geometrias.caratula, MATERIAL_CARATULA, indicesBrujula.length]} frustumCulled={false} renderOrder={3} />
          <instancedMesh ref={refNorte} args={[geometrias.norte, MATERIAL_NORTE, indicesBrujula.length]} frustumCulled={false} castShadow />
          <instancedMesh ref={refSur} args={[geometrias.sur, MATERIAL_SUR, indicesBrujula.length]} frustumCulled={false} castShadow />
        </>
      )}
    </group>
  );
}
