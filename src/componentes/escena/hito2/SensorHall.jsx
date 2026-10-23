/* Sensor Hall SS49E frente a la punta del perno: cuerpo negro con la cara plana hacia -x, patas
   que bajan y se abren a 2.54 mm, y tres conectores DuPont hembra de pie de los que salen los
   cables (sus extremos inferiores son los terminales hall1..hall3 del netlist). */
import { useMemo } from "react";
import { TubeGeometry } from "three";
import { MATERIALES } from "../comunes/materiales.js";
import { curvaConEsquinas } from "../comunes/curvas.js";
import { EJE_PERNO, SENSOR, EXTERNOS_HITO_2, patasSensor } from "../../../geometria/montajeHito2.js";

export default function SensorHall() {
  const patas = useMemo(() => patasSensor().map((p) => new TubeGeometry(curvaConEsquinas(p, 0.06), 24, 0.022, 6, false)), []);
  const conectores = ["hall1", "hall2", "hall3"].map((n) => EXTERNOS_HITO_2[n]);

  return (
    <group>
      <mesh position={[SENSOR.xCara + SENSOR.tamano[0] / 2, EJE_PERNO.y, EJE_PERNO.z]} material={MATERIALES.plasticoNegro} castShadow>
        <boxGeometry args={SENSOR.tamano} />
      </mesh>
      {patas.map((geometria, i) => (
        <mesh key={i} geometry={geometria} material={MATERIALES.estano} castShadow />
      ))}
      {conectores.map(([x, y, z]) => (
        <mesh key={z} position={[x, y + SENSOR.altoConector / 2, z]} material={MATERIALES.plasticoNegroMate} castShadow receiveShadow>
          <boxGeometry args={[0.25, SENSOR.altoConector, 0.245]} />
        </mesh>
      ))}
    </group>
  );
}
