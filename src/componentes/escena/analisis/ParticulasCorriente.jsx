/* Corriente del lazo de potencia del Hito 2 como partículas que avanzan por los cables en el
   sentido de la corriente convencional (CORRIENTES_HITO_2). La velocidad es proporcional a la
   corriente de su rama: la del solenoide siempre; la de la fuente y el transistor solo con el
   transistor encendido (en promedio, i - i_diodo). Es una velocidad visual, no la de deriva. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { CIRCUITOS, CORRIENTES_HITO_2 } from "../../../geometria/circuitos.js";
import { posicionUbicacion, salidaUbicacion } from "../../../geometria/montaje.js";
import { rutaCable, llevaConector } from "../../../geometria/cables.js";
import { curvaSuave } from "../comunes/curvas.js";
import { COLORES_ANALISIS } from "./primitivas.js";
import { instanteActual } from "./solicitudes.js";

const ESPACIADO = 1.1;      // entre partículas [cm]
const VELOCIDAD = 6;        // con la corriente máxima (I_on) [cm/s]
const RADIO = 0.1;
const auxiliar = new Object3D();

// Curva de cada cable del lazo, igual que la dibuja CircuitoHito
function cablesLazo() {
  return Object.entries(CORRIENTES_HITO_2).map(([id, { rama, sentido }]) => {
    const c = CIRCUITOS[2].cables.find((x) => x.id === id);
    const ruta = rutaCable(posicionUbicacion(2, c.desde), posicionUbicacion(2, c.hasta), {
      conectorDesde: llevaConector(c.desde),
      conectorHasta: llevaConector(c.hasta),
      salidaDesde: salidaUbicacion(2, c.desde),
      salidaHasta: salidaUbicacion(2, c.hasta),
    });
    const curva = curvaSuave(ruta);
    const largo = curva.getLength();
    return { id, rama, sentido, curva, largo, n: Math.max(2, Math.round(largo / ESPACIADO)) };
  });
}

export default function ParticulasCorriente() {
  const cables = useMemo(() => cablesLazo(), []);
  const total = cables.reduce((s, c) => s + c.n, 0);
  const malla = useRef(null);
  const recorrido = useRef({ solenoide: 0, fuente: 0 });

  useFrame((_, dt) => {
    const s = usarGemelo.getState();
    if (s.hito !== 2 || !malla.current) return;
    const a = instanteActual(s);
    const intensidad = { solenoide: a.intensidad, fuente: a.intensidadFuente };
    const paso = Math.min(dt, 0.1);
    for (const rama of ["solenoide", "fuente"]) recorrido.current[rama] += VELOCIDAD * intensidad[rama] * paso;

    let i = 0;
    for (const c of cables) {
      const visible = intensidad[c.rama] > 0.01;
      const avance = recorrido.current[c.rama];
      for (let k = 0; k < c.n; k++, i++) {
        // Posición sobre el cable en cm, avanzando de `desde` a `hasta` si sentido > 0
        const sCable = (((k * c.largo) / c.n + c.sentido * avance) % c.largo + c.largo) % c.largo;
        c.curva.getPointAt(sCable / c.largo, auxiliar.position);
        auxiliar.scale.setScalar(visible ? 1 : 0);
        auxiliar.updateMatrix();
        malla.current.setMatrixAt(i, auxiliar.matrix);
      }
    }
    malla.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={malla} args={[null, null, total]} frustumCulled={false}>
      <sphereGeometry args={[RADIO, 10, 8]} />
      <meshBasicMaterial color={COLORES_ANALISIS.corriente} toneMapped={false} />
    </instancedMesh>
  );
}
