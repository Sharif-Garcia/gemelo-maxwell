/* Perno de hierro de 5/16" acostado sobre el eje x: caña, cabeza hexagonal en la cola y rosca
   helicoidal en el tramo de la punta (la que mira al sensor). */
import { useMemo } from "react";
import { Curve, Vector3, TubeGeometry } from "three";
import { MATERIALES } from "../comunes/materiales.js";
import { EJE_PERNO, PASO_ROSCA, cabezaPerno } from "../../../geometria/montajeHito2.js";

// Hélice de la rosca alrededor del eje x, de x0 a x1
class Rosca extends Curve {
  constructor(x0, x1, radio) {
    super();
    this.x0 = x0;
    this.x1 = x1;
    this.radio = radio;
  }

  getPoint(u, destino = new Vector3()) {
    const x = this.x0 + u * (this.x1 - this.x0);
    const angulo = (2 * Math.PI * (x - this.x0)) / PASO_ROSCA;
    return destino.set(x, EJE_PERNO.y + this.radio * Math.cos(angulo), EJE_PERNO.z + this.radio * Math.sin(angulo));
  }
}

export default function Perno({ perno }) {
  const { xCola, xPunta, largo, radio } = perno;
  const cabeza = cabezaPerno(radio);
  const rosca = useMemo(() => {
    const tramo = Math.min(2.5, largo * 0.45);
    const vueltas = tramo / PASO_ROSCA;
    return new TubeGeometry(new Rosca(xPunta - tramo, xPunta - 0.05, radio), Math.ceil(vueltas * 16), radio * 0.07, 5, false);
  }, [xPunta, largo, radio]);

  return (
    <group>
      <mesh position={[(xCola + xPunta) / 2, EJE_PERNO.y, EJE_PERNO.z]} rotation-z={Math.PI / 2} material={MATERIALES.aceroCincado} castShadow receiveShadow>
        <cylinderGeometry args={[radio, radio, largo, 32]} />
      </mesh>
      <mesh geometry={rosca} material={MATERIALES.aceroCincado} castShadow />
      <mesh position={[xCola - cabeza.alto / 2, EJE_PERNO.y, EJE_PERNO.z]} rotation-z={Math.PI / 2} material={MATERIALES.aceroCincado} castShadow>
        <cylinderGeometry args={[cabeza.entreCaras / Math.sqrt(3), cabeza.entreCaras / Math.sqrt(3), cabeza.alto, 6]} />
      </mesh>
    </group>
  );
}
