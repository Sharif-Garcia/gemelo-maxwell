/* Cable DuPont entre dos puntos de escena: aislante de color sobre una curva suave y carcasas
   negras de conector macho en los extremos que entran a la protoboard o a un header. */
import { useMemo } from "react";
import { TubeGeometry } from "three";
import { MATERIALES, materialAislante } from "./materiales.js";
import { curvaSuave } from "./curvas.js";
import { rutaCable, CONECTOR } from "../../../geometria/cables.js";

const RADIO_CABLE = 0.055;

function Conector({ punto }) {
  return (
    <group position={punto}>
      <mesh position={[0, CONECTOR.alto / 2, 0]} material={MATERIALES.plasticoNegro} castShadow>
        <boxGeometry args={[CONECTOR.lado, CONECTOR.alto, CONECTOR.lado]} />
      </mesh>
    </group>
  );
}

export default function CableDupont({ desde, hasta, color, conectorDesde = true, conectorHasta = true, salidaDesde = null, salidaHasta = null }) {
  const geometria = useMemo(() => {
    const ruta = rutaCable(desde, hasta, { conectorDesde, conectorHasta, salidaDesde, salidaHasta });
    return new TubeGeometry(curvaSuave(ruta), 96, RADIO_CABLE, 8, false);
  }, [desde, hasta, conectorDesde, conectorHasta, salidaDesde, salidaHasta]);

  return (
    <group>
      <mesh geometry={geometria} material={materialAislante(color)} castShadow />
      {conectorDesde && <Conector punto={desde} />}
      {conectorHasta && <Conector punto={hasta} />}
    </group>
  );
}
