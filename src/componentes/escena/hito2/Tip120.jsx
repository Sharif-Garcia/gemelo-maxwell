/* TIP120 en encapsulado TO-220, de pie sobre la protoboard: patas B, C y E en los agujeros del
   netlist, cuerpo de epoxi con el rótulo al frente (+z) y aleta metálica con su agujero detrás. */
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { MATERIALES } from "../comunes/materiales.js";
import { crearTexturaCanvas, texto } from "../comunes/texturas.js";

const CUERPO = [1.0, 0.9, 0.45];   // x, y, z [cm]
const ALETA = { alto: 0.65, espesor: 0.13, radioAgujero: 0.18 };
const LIBRE = 0.4;                  // pata visible sobre la protoboard

function dibujarRotulo(ctx, ancho, alto) {
  ctx.fillStyle = "#18181a";
  ctx.fillRect(0, 0, ancho, alto);
  texto(ctx, "TIP120", ancho / 2, alto * 0.42, { tamano: alto * 0.2, color: "#d9d9d9" });
  texto(ctx, "NPN DARLINGTON", ancho / 2, alto * 0.66, { tamano: alto * 0.08, peso: 500, color: "#9a9a9a" });
}

export default function Tip120({ base, colector, emisor }) {
  const rotulo = useMemo(() => new MeshStandardMaterial({ map: crearTexturaCanvas(256, 230, dibujarRotulo), roughness: 0.75 }), []);
  const yHoyo = colector[1];
  const yCuerpo = yHoyo + LIBRE + CUERPO[1] / 2;
  const zCuerpo = colector[2] - 0.1;
  const zAleta = zCuerpo - CUERPO[2] / 2 - ALETA.espesor / 2;

  return (
    <group>
      {[base, colector, emisor].map((p, i) => (
        <mesh key={i} position={[p[0], yHoyo + (LIBRE - 0.25) / 2, p[2]]} material={MATERIALES.estano} castShadow>
          <boxGeometry args={[0.08, LIBRE + 0.25, 0.05]} />
        </mesh>
      ))}
      <mesh position={[colector[0], yCuerpo, zCuerpo]} material={MATERIALES.plasticoNegroMate} castShadow receiveShadow>
        <boxGeometry args={CUERPO} />
      </mesh>
      <mesh position={[colector[0], yCuerpo, zCuerpo + CUERPO[2] / 2 + 0.001]} material={rotulo}>
        <planeGeometry args={[CUERPO[0] * 0.98, CUERPO[1] * 0.98]} />
      </mesh>
      {/* Aleta metálica: detrás del cuerpo y sobresaliendo por arriba, con su agujero */}
      <mesh position={[colector[0], yCuerpo + ALETA.alto / 2, zAleta]} material={MATERIALES.niquel} castShadow>
        <boxGeometry args={[CUERPO[0], CUERPO[1] + ALETA.alto, ALETA.espesor]} />
      </mesh>
      <mesh position={[colector[0], yCuerpo + CUERPO[1] / 2 + ALETA.alto / 2, zAleta]} rotation-x={Math.PI / 2} material={MATERIALES.agujero}>
        <cylinderGeometry args={[ALETA.radioAgujero, ALETA.radioAgujero, ALETA.espesor + 0.004, 24]} />
      </mesh>
    </group>
  );
}
