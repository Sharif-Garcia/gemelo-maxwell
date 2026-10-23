/* Muchas cajas iguales en una sola InstancedMesh (agujeros, patas de chips, pines). */
import { useLayoutEffect, useRef } from "react";
import { Object3D } from "three";

const auxiliar = new Object3D();

export default function CajasInstanciadas({ posiciones, tamano, material, sombras = false }) {
  const malla = useRef(null);
  useLayoutEffect(() => {
    posiciones.forEach((p, i) => {
      auxiliar.position.set(p[0], p[1], p[2]);
      auxiliar.updateMatrix();
      malla.current.setMatrixAt(i, auxiliar.matrix);
    });
    malla.current.instanceMatrix.needsUpdate = true;
    malla.current.computeBoundingSphere();
  }, [posiciones]);
  return (
    <instancedMesh ref={malla} args={[undefined, material, posiciones.length]} castShadow={sombras} receiveShadow={sombras}>
      <boxGeometry args={tamano} />
    </instancedMesh>
  );
}
