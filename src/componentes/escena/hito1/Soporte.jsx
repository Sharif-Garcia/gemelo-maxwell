/* Soporte universal de laboratorio: base de hierro fundido, varilla cromada y dos pinzas con
   brazo y anillo que sujetan el tubo por encima y por debajo de la bobina. */
import { RoundedBox } from "@react-three/drei";
import { MATERIALES } from "../comunes/materiales.js";
import { SOPORTE, EJE_TUBO } from "../../../geometria/montajeHito1.js";

function Pinza({ y, radioTubo }) {
  const { varilla } = SOPORTE;
  const radioAnillo = radioTubo + 0.14;
  // El brazo va de la nuez (en la varilla) hasta el anillo, a lo largo de z
  const zInicio = varilla.z + varilla.radio + 0.3;
  const zFin = EJE_TUBO.z - radioAnillo;
  const largo = zFin - zInicio;
  return (
    <group>
      {/* Nuez sobre la varilla, con su tornillo */}
      <RoundedBox args={[1.3, 1.1, 1.3]} radius={0.12} smoothness={3} position={[varilla.x, y, varilla.z]} material={MATERIALES.hierroFundido} castShadow />
      <mesh position={[varilla.x - 0.95, y, varilla.z]} rotation-z={Math.PI / 2} material={MATERIALES.cromo} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 16]} />
      </mesh>
      {/* Brazo y anillo */}
      <mesh position={[EJE_TUBO.x, y, zInicio + largo / 2]} rotation-x={Math.PI / 2} material={MATERIALES.cromo} castShadow>
        <cylinderGeometry args={[0.16, 0.16, largo, 16]} />
      </mesh>
      <mesh position={[EJE_TUBO.x, y, EJE_TUBO.z]} rotation-x={Math.PI / 2} material={MATERIALES.cromo} castShadow>
        <torusGeometry args={[radioAnillo, 0.13, 12, 40]} />
      </mesh>
    </group>
  );
}

export default function Soporte({ alturasPinzas, radioTubo }) {
  const { base, varilla } = SOPORTE;
  const yBaseVarilla = base.centro[1] + base.tamano[1] / 2;
  return (
    <group>
      <RoundedBox args={base.tamano} radius={0.25} smoothness={4} position={base.centro} material={MATERIALES.hierroFundido} castShadow receiveShadow />
      <mesh position={[varilla.x, (yBaseVarilla + varilla.yTope) / 2, varilla.z]} material={MATERIALES.cromo} castShadow>
        <cylinderGeometry args={[varilla.radio, varilla.radio, varilla.yTope - yBaseVarilla, 24]} />
      </mesh>
      {alturasPinzas.map((y) => (
        <Pinza key={y} y={y} radioTubo={radioTubo} />
      ))}
    </group>
  );
}
