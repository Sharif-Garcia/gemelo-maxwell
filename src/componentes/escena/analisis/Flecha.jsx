/* Flecha recta (vector) en la escena, siempre visible sobre las piezas semitransparentes.
   API del ref: ref.current.fijar(origen, direccion, largo, visible); `direccion` unitaria y
   `largo` en cm. La punta conserva su tamaño y el cuerpo se estira. */
import { useImperativeHandle, useRef } from "react";
import { Vector3 } from "three";
import { orientarSegunY } from "./primitivas.js";

const d = new Vector3();

export default function Flecha({ ref, color, radio = 0.06, punta = { radio: 0.18, largo: 0.45 } }) {
  const grupo = useRef(null);
  const cuerpo = useRef(null);
  const cabeza = useRef(null);

  useImperativeHandle(ref, () => ({
    fijar(origen, direccion, largo, visible = true) {
      const g = grupo.current;
      if (!g) return;
      g.visible = visible && largo > 0.05;
      if (!g.visible) return;
      d.set(...direccion);
      g.position.set(...origen);
      orientarSegunY(d, g.quaternion);
      const largoPunta = Math.min(punta.largo, 0.5 * largo);
      cabeza.current.scale.setScalar(largoPunta / punta.largo);
      cabeza.current.position.y = largo - largoPunta / 2;
      cuerpo.current.scale.set(1, Math.max(largo - largoPunta, 1e-4), 1);
      cuerpo.current.position.y = (largo - largoPunta) / 2;
    },
  }), [punta.largo]);

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={cuerpo} renderOrder={10}>
        <cylinderGeometry args={[radio, radio, 1, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent />
      </mesh>
      <mesh ref={cabeza} renderOrder={10}>
        <coneGeometry args={[punta.radio, punta.largo, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent />
      </mesh>
    </group>
  );
}
