/* Montaje del Hito 1 (boceto 1): soporte, tubo, bobina con sus alambres, bornera e imán. El
   Arduino, la protoboard, el divisor y los cables los pone CircuitoHito. Las piezas siguen a los
   parámetros de la simulación (N, capas, AWG, r_int, d_im, L_im). */
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { geometriaBobina } from "../../../fisica/bobina.js";
import { alturasPinzas, BORNERA } from "../../../geometria/montajeHito1.js";
import { aEscena } from "../../../geometria/unidades.js";
import Soporte from "./Soporte.jsx";
import Tubo from "./Tubo.jsx";
import BobinaFaraday from "./BobinaFaraday.jsx";
import Bornera from "../comunes/Bornera.jsx";
import Iman from "./Iman.jsx";

// Parámetros del Hito 1 estén activos o guardados (por si el estado cambia de hito antes de desmontar)
const parametrosHito1 = (s) => (s.hito === 1 ? s.sim.p : s.guardados[1].sim.p);

export default function MontajeFaraday() {
  const { N, capas, AWG, r_int, d_im, L_im } = usarGemelo(
    useShallow((s) => {
      const p = parametrosHito1(s);
      return { N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.r_int, d_im: p.d_im, L_im: p.L_im };
    }),
  );
  const bobina = useMemo(() => geometriaBobina({ N, capas, AWG, r_int }), [N, capas, AWG, r_int]);
  const pinzas = useMemo(() => alturasPinzas(bobina), [bobina]);

  return (
    <group>
      <Soporte alturasPinzas={pinzas} radioTubo={aEscena(r_int)} />
      <Tubo radio={aEscena(r_int)} />
      <BobinaFaraday bobina={bobina} />
      <Bornera bornera={BORNERA} />
      <Iman d_im={d_im} L_im={L_im} />
    </group>
  );
}
