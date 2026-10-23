/* Tapete antiestático de laboratorio sobre el que se arman los montajes (geometria/mesa.js). */
import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { TAPETE, ALTO_TAPETE } from "../../../geometria/mesa.js";

function crearTapete() {
  const { ancho, fondo, radio } = TAPETE;
  const x = ancho / 2;
  const z = fondo / 2;
  // Rectángulo con esquinas redondeadas en el plano (x, z), extruido hacia arriba
  const forma = new Shape();
  forma.moveTo(-x + radio, -z);
  forma.lineTo(x - radio, -z);
  forma.quadraticCurveTo(x, -z, x, -z + radio);
  forma.lineTo(x, z - radio);
  forma.quadraticCurveTo(x, z, x - radio, z);
  forma.lineTo(-x + radio, z);
  forma.quadraticCurveTo(-x, z, -x, z - radio);
  forma.lineTo(-x, -z + radio);
  forma.quadraticCurveTo(-x, -z, -x + radio, -z);
  const geometria = new ExtrudeGeometry(forma, {
    depth: ALTO_TAPETE - 0.08,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 8,
  });
  // La forma está en (x, y): se acuesta para que el espesor quede en +y y la cara superior en ALTO_TAPETE
  geometria.rotateX(Math.PI / 2);
  geometria.translate(0, ALTO_TAPETE - 0.04, 0);
  return geometria;
}

export default function Mesa() {
  const geometria = useMemo(() => crearTapete(), []);
  return (
    <mesh geometry={geometria} receiveShadow castShadow>
      {/* Gris claro neutro: la escala de |B| va de claro (débil) a azul oscuro (intenso) y sobre un
          tapete oscuro se leería al revés */}
      <meshStandardMaterial color="#c9ccd1" roughness={0.92} metalness={0} />
    </mesh>
  );
}
