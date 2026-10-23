/* Bornera de 2 polos (cuerpo verde, tornillos arriba y entradas por las caras -x y +x).
   `bornera` es su configuración en la geometría del montaje: { centro, tamano, polos }. */
import { RoundedBox } from "@react-three/drei";
import { MATERIALES } from "./materiales.js";

export default function Bornera({ bornera }) {
  const [ancho, alto, fondo] = bornera.tamano;
  return (
    <group position={bornera.centro}>
      <RoundedBox args={[ancho, alto, fondo]} radius={0.06} smoothness={3} material={MATERIALES.borneraVerde} castShadow receiveShadow />
      {bornera.polos.map((dz) => (
        <group key={dz} position={[0, 0, dz]}>
          {/* Tornillo con ranura */}
          <mesh position={[0, alto / 2 + 0.02, 0]} material={MATERIALES.niquel} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 20]} />
          </mesh>
          <mesh position={[0, alto / 2 + 0.051, 0]} material={MATERIALES.plasticoNegroMate}>
            <boxGeometry args={[0.26, 0.01, 0.04]} />
          </mesh>
          {/* Entradas a ambos lados */}
          {[-1, 1].map((cara) => (
            <mesh key={cara} position={[(cara * ancho) / 2 + cara * 0.002, 0, 0]} material={MATERIALES.agujero}>
              <boxGeometry args={[0.004, 0.22, 0.22]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
