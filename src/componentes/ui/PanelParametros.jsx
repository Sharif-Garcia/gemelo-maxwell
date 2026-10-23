/* Panel izquierdo: hito, escenario y parámetros del hito agrupados en secciones plegables. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { GRUPOS } from "../../estado/parametros.js";
import { MEDIDAS } from "./medidas.js";
import PanelLateral from "./PanelLateral.jsx";
import SelectorHito from "./SelectorHito.jsx";
import SelectorEscenarios from "./SelectorEscenarios.jsx";
import GrupoParametros from "./GrupoParametros.jsx";

export default function PanelParametros() {
  const hito = usarGemelo((s) => s.hito);
  const abierto = usarGemelo((s) => s.paneles.parametros);
  const alternarPanel = usarGemelo((s) => s.alternarPanel);
  return (
    <PanelLateral
      lado="izquierda"
      titulo="Parámetros"
      ancho={MEDIDAS.anchoParametros}
      abierto={abierto}
      onAlternar={() => alternarPanel("parametros")}
    >
      <SelectorHito />
      <SelectorEscenarios />
      {GRUPOS[hito].map((g) => <GrupoParametros key={`${hito}-${g.id}`} grupo={g} />)}
    </PanelLateral>
  );
}
