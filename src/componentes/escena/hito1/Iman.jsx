/* Imán cilíndrico de neodimio niquelado (bordes biselados). Se mueve dentro del tubo según x(t)
   en cada cuadro, sin renders de React. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry, Vector2 } from "three";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { MATERIALES } from "../comunes/materiales.js";
import { EJE_TUBO, alturaImanEnTubo } from "../../../geometria/montajeHito1.js";
import { aEscena } from "../../../geometria/unidades.js";

export default function Iman({ d_im, L_im }) {
  const grupo = useRef(null);
  const geometria = useMemo(() => {
    const R = aEscena(d_im) / 2;
    const h = aEscena(L_im) / 2;
    const bisel = Math.min(0.04, R / 4, h / 4);
    const perfil = [[0, -h], [R - bisel, -h], [R, -h + bisel], [R, h - bisel], [R - bisel, h], [0, h]];
    return new LatheGeometry(perfil.map(([r, y]) => new Vector2(r, y)), 48);
  }, [d_im, L_im]);

  useFrame(() => {
    const { hito, sim, indice } = usarGemelo.getState();
    if (hito !== 1 || !grupo.current) return;
    grupo.current.position.y = alturaImanEnTubo(sim.r.x[indice], sim.p.L_im);
  });

  return (
    <group ref={grupo} position={[EJE_TUBO.x, 0, EJE_TUBO.z]}>
      <mesh geometry={geometria} material={MATERIALES.niquel} castShadow />
    </group>
  );
}
