/* Tubo vertical de acrílico transparente (pared de 0.6 mm) con el tope de espuma al fondo.
   Su radio exterior es el r_int de la bobina. */
import { useMemo } from "react";
import { LatheGeometry, Vector2 } from "three";
import { MATERIALES } from "../comunes/materiales.js";
import { TUBO, TOPE, EJE_TUBO } from "../../../geometria/montajeHito1.js";

export default function Tubo({ radio }) {
  // Perfil cerrado de la pared: por fuera hacia arriba y por dentro hacia abajo
  const geometria = useMemo(() => {
    const dentro = radio - TUBO.pared;
    const perfil = [[dentro, TUBO.yBase], [radio, TUBO.yBase], [radio, TUBO.yTope], [dentro, TUBO.yTope], [dentro, TUBO.yBase]];
    return new LatheGeometry(perfil.map(([r, y]) => new Vector2(r, y)), 48);
  }, [radio]);

  return (
    <group position={[EJE_TUBO.x, 0, EJE_TUBO.z]}>
      <mesh geometry={geometria} material={MATERIALES.acrilico} />
      <mesh position={[0, TOPE.yBase + TOPE.alto / 2, 0]} material={MATERIALES.espuma} receiveShadow>
        <cylinderGeometry args={[radio - TUBO.pared - 0.02, radio - TUBO.pared - 0.02, TOPE.alto, 32]} />
      </mesh>
    </group>
  );
}
