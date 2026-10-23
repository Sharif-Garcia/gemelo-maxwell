/* Montaje del Hito 2 (boceto 2 con el solenoide en lugar del motor): perno y solenoide con su
   bornera y sus soportes, SS49E, TIP120 y 1N4007 en la protoboard y la fuente de 12 V. El Arduino,
   la protoboard, la resistencia de base y los cables los pone CircuitoHito. Las piezas siguen a
   los parámetros de la simulación; sin diodo flyback, el diodo no se dibuja. */
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { geometriaBobina } from "../../../fisica/bobina.js";
import { CIRCUITOS } from "../../../geometria/circuitos.js";
import { posicionUbicacion } from "../../../geometria/montaje.js";
import { colocacionPerno } from "../../../geometria/montajeHito2.js";
import Perno from "./Perno.jsx";
import Solenoide from "./Solenoide.jsx";
import SensorHall from "./SensorHall.jsx";
import Tip120 from "./Tip120.jsx";
import Diodo1N4007 from "./Diodo1N4007.jsx";
import Fuente12V from "./Fuente12V.jsx";

// Parámetros del Hito 2 estén activos o guardados (por si el estado cambia de hito antes de desmontar)
const parametrosHito2 = (s) => (s.hito === 2 ? s.sim.p : s.guardados[2].sim.p);

// Terminales del transistor y del diodo en la escena (agujeros del netlist)
const terminal = (id, nombre) => posicionUbicacion(2, CIRCUITOS[2].componentes.find((c) => c.id === id).terminales[nombre]);
const Q1 = { base: terminal("Q1", "B"), colector: terminal("Q1", "C"), emisor: terminal("Q1", "E") };
const D1 = { anodo: terminal("D1", "anodo"), catodo: terminal("D1", "catodo") };

export default function MontajeAmpere() {
  const p = usarGemelo(
    useShallow((s) => {
      const q = parametrosHito2(s);
      return { N: q.N, capas: q.capas, AWG: q.AWG, d_nuc: q.d_nuc, L_nuc: q.L_nuc, d_sensor: q.d_sensor, z_bob: q.z_bob, con_diodo: q.con_diodo };
    }),
  );
  const bobina = useMemo(() => geometriaBobina({ N: p.N, capas: p.capas, AWG: p.AWG, r_int: p.d_nuc / 2 }), [p.N, p.capas, p.AWG, p.d_nuc]);
  const perno = useMemo(
    () => colocacionPerno({ L_nuc: p.L_nuc, d_sensor: p.d_sensor, d_nuc: p.d_nuc, z_bob: p.z_bob }),
    [p.L_nuc, p.d_sensor, p.d_nuc, p.z_bob],
  );

  return (
    <group>
      <Perno perno={perno} />
      <Solenoide bobina={bobina} perno={perno} />
      <SensorHall />
      <Tip120 {...Q1} />
      {p.con_diodo && <Diodo1N4007 {...D1} />}
      <Fuente12V />
    </group>
  );
}
