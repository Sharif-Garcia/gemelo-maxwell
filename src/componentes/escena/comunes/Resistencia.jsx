/* Resistencia de 1/4 W entre dos agujeros (posiciones de escena): cuerpo torneado con las bandas
   del código de colores y patas estañadas dobladas hacia los agujeros. */
import { useMemo } from "react";
import { LatheGeometry, TubeGeometry, Vector2, Vector3, Quaternion } from "three";
import { MATERIALES, materialColor } from "./materiales.js";
import { curvaConEsquinas } from "./curvas.js";
import { geometriaAxial } from "../../../geometria/cables.js";
import { bandasResistencia } from "../../../geometria/resistencia.js";

const LARGO = 0.63;
// Perfil del cuerpo (radio, posición a lo largo del eje): extremos abultados y centro delgado
const PERFIL = [
  [0, -0.315], [0.07, -0.312], [0.105, -0.295], [0.116, -0.25], [0.112, -0.2], [0.1, -0.15],
  [0.1, 0.15], [0.112, 0.2], [0.116, 0.25], [0.105, 0.295], [0.07, 0.312], [0, 0.315],
].map(([r, y]) => new Vector2(r, y));
const GEOMETRIA_CUERPO = new LatheGeometry(PERFIL, 32);
// Bandas: posición en el eje y radio (las de los extremos van sobre la parte abultada)
const BANDAS = [[-0.22, 0.119], [-0.12, 0.103], [-0.03, 0.103], [0.21, 0.119]];

export default function Resistencia({ a, b, valor }) {
  const { centro, giro, patas } = useMemo(() => {
    const g = geometriaAxial(a, b, { largoCuerpo: LARGO });
    return {
      centro: g.centro,
      giro: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...g.direccion)),
      patas: g.patas.map((puntos) => new TubeGeometry(curvaConEsquinas(puntos, 0.07), 24, 0.028, 8, false)),
    };
  }, [a, b]);
  const colores = useMemo(() => bandasResistencia(valor), [valor]);

  return (
    <group>
      <group position={centro} quaternion={giro}>
        <mesh geometry={GEOMETRIA_CUERPO} material={MATERIALES.cuerpoResistencia} castShadow />
        {BANDAS.map(([y, r], i) => (
          <mesh key={i} position={[0, y, 0]} material={materialColor(colores[i].hex, { roughness: 0.5 })}>
            <cylinderGeometry args={[r, r, 0.045, 32, 1, true]} />
          </mesh>
        ))}
      </group>
      {patas.map((geometria, i) => (
        <mesh key={i} geometry={geometria} material={MATERIALES.estano} castShadow />
      ))}
    </group>
  );
}
