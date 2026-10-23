/* Solenoide devanado sobre el perno (eje x), sus alambres hasta la bornera y los bloques en V de
   madera que sostienen el perno. Se reconstruye con N, capas, AWG, d_nuc, L_nuc, d_sensor y z_bob. */
import { useMemo } from "react";
import { MATERIALES } from "../comunes/materiales.js";
import Devanado, { Alambres } from "../comunes/Devanado.jsx";
import Bornera from "../comunes/Bornera.jsx";
import { EJE_PERNO, BLOQUE_V, BORNERA_SOLENOIDE, ANGULO_SALIDA, soportesPerno, alambresSolenoide } from "../../../geometria/montajeHito2.js";
import { ALTO_TAPETE } from "../../../geometria/mesa.js";

export default function Solenoide({ bobina, perno }) {
  const alambres = useMemo(() => alambresSolenoide(bobina, perno), [bobina, perno]);
  const soportes = useMemo(() => soportesPerno(perno, bobina), [perno, bobina]);

  return (
    <group>
      {/* El devanado tiene su eje en +y: se gira -90° alrededor de z para llevarlo a +x */}
      <group position={[perno.xBobina, EJE_PERNO.y, EJE_PERNO.z]} rotation-z={-Math.PI / 2}>
        <Devanado bobina={bobina} angulo0={ANGULO_SALIDA} />
      </group>
      <Alambres alambres={alambres} d_hilo={bobina.d_hilo} />
      <Bornera bornera={BORNERA_SOLENOIDE} />
      {soportes.map(({ x, yTope }) => (
        <mesh key={x} position={[x, (ALTO_TAPETE + yTope) / 2, EJE_PERNO.z]} material={MATERIALES.madera} castShadow receiveShadow>
          <boxGeometry args={[BLOQUE_V.ancho, yTope - ALTO_TAPETE, BLOQUE_V.fondo]} />
        </mesh>
      ))}
    </group>
  );
}
