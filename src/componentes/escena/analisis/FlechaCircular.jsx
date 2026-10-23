/* Flecha circular alrededor de un eje: el sentido de una corriente que circula por una bobina
   (regla de la mano derecha con el campo que produce). Un arco de 300° con punta.
   API del ref: ref.current.fijar(centro, eje, sentido, intensidad):
   - eje: dirección unitaria del campo que produce la corriente (la mano derecha da el giro);
   - sentido: +1 gira según la mano derecha alrededor de `eje`, -1 al revés, 0 la oculta;
   - intensidad: 0 a 1, la opacidad. */
import { useImperativeHandle, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { orientarSegunY } from "./primitivas.js";

const ARCO = (300 * Math.PI) / 180;
const e = new Vector3();

export default function FlechaCircular({ ref, color, radio, grosor = 0.07 }) {
  const grupo = useRef(null);
  const giro = useRef(null);
  const materiales = useRef([]);
  // Punta tangente al final del arco (el toro va de 0 a ARCO en el plano xy local)
  const punta = useMemo(() => ({
    posicion: [radio * Math.cos(ARCO), radio * Math.sin(ARCO), 0],
    rotacion: [0, 0, ARCO],
    radio: grosor * 3,
    largo: grosor * 7,
  }), [radio, grosor]);

  useImperativeHandle(ref, () => ({
    fijar(centro, eje, sentido, intensidad = 1) {
      const g = grupo.current;
      if (!g) return;
      g.visible = sentido !== 0 && intensidad > 0.02;
      if (!g.visible) return;
      g.position.set(...centro);
      // El plano del arco (xy local) debe ser normal al eje: llevar +y local al eje y girar
      // el arco a ese plano; con sentido -1 se refleja
      e.set(...eje);
      orientarSegunY(e, g.quaternion);
      giro.current.rotation.set(Math.PI / 2, 0, 0);
      giro.current.scale.set(1, sentido > 0 ? -1 : 1, 1);
      for (const m of materiales.current) m.opacity = 0.35 + 0.65 * Math.min(1, intensidad);
    },
  }), []);

  const registrar = (m) => {
    if (m && !materiales.current.includes(m)) materiales.current.push(m);
  };

  return (
    <group ref={grupo} visible={false}>
      <group ref={giro}>
        <mesh renderOrder={10}>
          <torusGeometry args={[radio, grosor, 8, 64, ARCO]} />
          <meshBasicMaterial ref={registrar} color={color} toneMapped={false} transparent depthTest={false} />
        </mesh>
        <mesh position={punta.posicion} rotation={punta.rotacion} renderOrder={10}>
          <coneGeometry args={[punta.radio, punta.largo, 12]} />
          <meshBasicMaterial ref={registrar} color={color} toneMapped={false} transparent depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
