/* Cota entre dos puntos en cualquier dirección (generaliza la vertical del polipasto): línea con
   puntas en ambos extremos y marcas de referencia cortas. Medidas en cm de escena.
   API del ref: ref.current.fijar(a, b, visible) con a y b en coordenadas de escena. */
import { useImperativeHandle, useRef } from "react";
import { Vector3 } from "three";
import { COLORES_ANALISIS, orientarSegunY } from "./primitivas.js";

const RADIO = 0.025;
const PUNTA = { radio: 0.08, largo: 0.24 };
const REFERENCIA = 0.6;   // largo de las marcas de los extremos
const direccion = new Vector3();

export default function Cota({ ref, color = COLORES_ANALISIS.cota }) {
  const grupo = useRef(null);
  const linea = useRef(null);
  const puntaFin = useRef(null);
  const puntaInicio = useRef(null);
  const marcaFin = useRef(null);

  useImperativeHandle(ref, () => ({
    fijar(a, b, visible = true) {
      const g = grupo.current;
      if (!g) return;
      direccion.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const largo = direccion.length();
      g.visible = visible && largo > 0.02;
      if (!g.visible) return;
      direccion.divideScalar(largo);
      g.position.set(...a);
      orientarSegunY(direccion, g.quaternion);
      // En cotas cortas las puntas se achican para que no se crucen
      const punta = Math.min(PUNTA.largo, largo / 2.5);
      const k = punta / PUNTA.largo;
      linea.current.scale.set(1, Math.max(largo - 2 * punta, 1e-4), 1);
      linea.current.position.y = largo / 2;
      puntaInicio.current.scale.setScalar(k);
      puntaInicio.current.position.y = punta / 2;
      puntaFin.current.scale.setScalar(k);
      puntaFin.current.position.y = largo - punta / 2;
      marcaFin.current.position.y = largo;
    },
  }), []);

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={linea}>
        <cylinderGeometry args={[RADIO, RADIO, 1, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={puntaFin}>
        <coneGeometry args={[PUNTA.radio, PUNTA.largo, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={puntaInicio} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[PUNTA.radio, PUNTA.largo, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIO * 0.7, RADIO * 0.7, REFERENCIA, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={marcaFin} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIO * 0.7, RADIO * 0.7, REFERENCIA, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
