/* Bobina del Hito 1: devanado por capas sobre el tubo (eje vertical) y los dos alambres que bajan
   hasta la bornera. Se reconstruye cuando cambian N, capas, AWG o r_int. */
import { useMemo } from "react";
import Devanado, { Alambres } from "../comunes/Devanado.jsx";
import { alambresBobina } from "../../../geometria/montajeHito1.js";
import { CENTRO_BOBINA_1 } from "../../../geometria/mesa.js";

export default function BobinaFaraday({ bobina }) {
  const alambres = useMemo(() => alambresBobina(bobina), [bobina]);
  return (
    <group>
      <group position={CENTRO_BOBINA_1}>
        <Devanado bobina={bobina} />
      </group>
      <Alambres alambres={alambres} d_hilo={bobina.d_hilo} />
    </group>
  );
}
