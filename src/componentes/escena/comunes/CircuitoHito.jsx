/* Piezas electrónicas comunes de un hito colocadas según su netlist (geometria/circuitos.js):
   Arduino, protoboard, resistencias y cables. Las piezas propias de cada hito (bobina, solenoide,
   TIP120, diodo, sensor, fuente) las agregan sus montajes. */
import { useMemo } from "react";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { CIRCUITOS, COLORES_CABLE } from "../../../geometria/circuitos.js";
import { MONTAJES, posicionUbicacion, salidaUbicacion } from "../../../geometria/montaje.js";
import { llevaConector } from "../../../geometria/cables.js";
import ArduinoUno from "./ArduinoUno.jsx";
import Protoboard from "./Protoboard.jsx";
import Resistencia from "./Resistencia.jsx";
import CableDupont from "./CableDupont.jsx";

export default function CircuitoHito({ hito }) {
  const { arduino, protoboard } = MONTAJES[hito];
  const circuito = CIRCUITOS[hito];
  // El valor de una resistencia puede venir de un parámetro (R_base en el Hito 2)
  const R_base = usarGemelo((s) => s.parametros.R_base);

  const resistencias = useMemo(
    () => circuito.componentes
      .filter((c) => c.tipo === "resistencia")
      .map((c) => ({
        id: c.id,
        parametro: c.parametro,
        valor: c.valor,
        a: posicionUbicacion(hito, c.terminales[1]),
        b: posicionUbicacion(hito, c.terminales[2]),
      })),
    [circuito, hito],
  );
  const cables = useMemo(
    () => circuito.cables.map((c) => ({
      id: c.id,
      color: COLORES_CABLE[c.color],
      desde: posicionUbicacion(hito, c.desde),
      hasta: posicionUbicacion(hito, c.hasta),
      conectorDesde: llevaConector(c.desde),
      conectorHasta: llevaConector(c.hasta),
      salidaDesde: salidaUbicacion(hito, c.desde),
      salidaHasta: salidaUbicacion(hito, c.hasta),
    })),
    [circuito, hito],
  );

  return (
    <group>
      <group position={arduino.posicion} rotation-y={arduino.rotY}>
        <ArduinoUno />
      </group>
      <group position={protoboard.posicion} rotation-y={protoboard.rotY}>
        <Protoboard />
      </group>
      {resistencias.map((r) => (
        <Resistencia key={r.id} a={r.a} b={r.b} valor={r.parametro === "R_base" ? R_base ?? r.valor : r.valor} />
      ))}
      {cables.map((c) => (
        <CableDupont key={c.id} {...c} />
      ))}
    </group>
  );
}
