/* Fuente externa de 12 V: adaptador con su rótulo, cable de salida, plug de barril dentro de un
   conector hembra con bornera; de la bornera salen los cables rojo y negro a la protoboard. */
import { useMemo } from "react";
import { MeshStandardMaterial, TubeGeometry } from "three";
import { RoundedBox } from "@react-three/drei";
import { MATERIALES } from "../comunes/materiales.js";
import { crearTexturaCanvas, texto } from "../comunes/texturas.js";
import { curvaSuave } from "../comunes/curvas.js";
import Bornera from "../comunes/Bornera.jsx";
import { FUENTE } from "../../../geometria/montajeHito2.js";
import { ALTO_TAPETE } from "../../../geometria/mesa.js";

function dibujarRotulo(ctx, ancho, alto) {
  ctx.fillStyle = "#202023";
  ctx.fillRect(0, 0, ancho, alto);
  texto(ctx, "12 V ⎓ 1 A", ancho / 2, alto * 0.42, { tamano: alto * 0.2, color: "#e2e2e2" });
  texto(ctx, "ADAPTADOR DC", ancho / 2, alto * 0.68, { tamano: alto * 0.1, peso: 500, color: "#9b9b9b" });
}

export default function Fuente12V() {
  const { adaptador, barril } = FUENTE;
  const rotulo = useMemo(() => new MeshStandardMaterial({ map: crearTexturaCanvas(512, 370, dibujarRotulo), roughness: 0.8 }), []);
  const xPlug = barril.centro[0] - barril.largo / 2 - 0.25;
  const cable = useMemo(() => {
    const salida = [adaptador.centro[0] + adaptador.tamano[0] / 2, ALTO_TAPETE + 1, adaptador.centro[2]];
    const puntos = [salida, [salida[0] + 0.8, ALTO_TAPETE + 0.25, salida[2] + 0.6], [xPlug - 1, ALTO_TAPETE + 0.25, barril.centro[2] + 0.8], [xPlug - 0.25, barril.centro[1], barril.centro[2]]];
    return new TubeGeometry(curvaSuave(puntos), 48, 0.16, 10, false);
  }, [adaptador, barril, xPlug]);

  return (
    <group>
      <RoundedBox args={adaptador.tamano} radius={0.35} smoothness={4} position={adaptador.centro} material={MATERIALES.plasticoNegroMate} castShadow receiveShadow />
      <mesh position={[adaptador.centro[0], adaptador.centro[1] + adaptador.tamano[1] / 2 + 0.002, adaptador.centro[2]]} rotation-x={-Math.PI / 2} material={rotulo}>
        <planeGeometry args={[adaptador.tamano[0] * 0.7, adaptador.tamano[2] * 0.5]} />
      </mesh>
      <mesh geometry={cable} material={MATERIALES.plasticoNegro} castShadow />
      {/* Plug metálico y conector hembra de barril */}
      <mesh position={[xPlug, barril.centro[1], barril.centro[2]]} rotation-z={Math.PI / 2} material={MATERIALES.niquel} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.5, 24]} />
      </mesh>
      <mesh position={barril.centro} rotation-z={Math.PI / 2} material={MATERIALES.plasticoNegro} castShadow>
        <cylinderGeometry args={[barril.radio, barril.radio, barril.largo, 32]} />
      </mesh>
      <Bornera bornera={FUENTE.bornera} />
    </group>
  );
}
