/* Diodo 1N4007 (DO-41) entre su ánodo y su cátodo: cuerpo negro con la franja plateada en el
   lado del cátodo (hacia +12 V) y patas dobladas hacia los agujeros. */
import { useMemo } from "react";
import { TubeGeometry, Vector3, Quaternion } from "three";
import { MATERIALES } from "../comunes/materiales.js";
import { curvaConEsquinas } from "../comunes/curvas.js";
import { geometriaAxial } from "../../../geometria/cables.js";

const LARGO = 0.52;
const RADIO = 0.135;

export default function Diodo1N4007({ anodo, catodo }) {
  const { centro, giro, patas } = useMemo(() => {
    // geometriaAxial va del primer punto al segundo: el extremo +y del cuerpo es el cátodo
    const g = geometriaAxial(anodo, catodo, { largoCuerpo: LARGO, altura: 0.28 });
    return {
      centro: g.centro,
      giro: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...g.direccion)),
      patas: g.patas.map((puntos) => new TubeGeometry(curvaConEsquinas(puntos, 0.07), 24, 0.03, 8, false)),
    };
  }, [anodo, catodo]);

  return (
    <group>
      <group position={centro} quaternion={giro}>
        <mesh material={MATERIALES.plasticoNegroMate} castShadow>
          <cylinderGeometry args={[RADIO, RADIO, LARGO, 28]} />
        </mesh>
        <mesh position={[0, LARGO / 2 - 0.08, 0]} material={MATERIALES.niquel}>
          <cylinderGeometry args={[RADIO + 0.002, RADIO + 0.002, 0.07, 28, 1, true]} />
        </mesh>
      </group>
      {patas.map((geometria, i) => (
        <mesh key={i} geometry={geometria} material={MATERIALES.estano} castShadow />
      ))}
    </group>
  );
}
