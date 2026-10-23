import Escena from "./componentes/escena/comunes/Escena.jsx";
import SelectorVistas from "./componentes/ui/SelectorVistas.jsx";
import Avisos from "./componentes/ui/Avisos.jsx";
import PanelParametros from "./componentes/ui/PanelParametros.jsx";
import ValoresEnVivo from "./componentes/ui/ValoresEnVivo.jsx";
import BarraReproduccion from "./componentes/ui/BarraReproduccion.jsx";
import Graficas from "./componentes/ui/Graficas.jsx";
import TarjetaPresentacion from "./componentes/ui/TarjetaPresentacion.jsx";
import Ayuda from "./componentes/ui/Ayuda.jsx";
import PantallaCarga from "./componentes/ui/PantallaCarga.jsx";
import { useReloj } from "./hooks/useReloj.js";
import { useAtajos } from "./hooks/useAtajos.js";
import { usarGemelo } from "./estado/usarGemelo.js";

export default function App() {
  useReloj();
  useAtajos();
  const presentacion = usarGemelo((s) => s.presentacion);
  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-200 font-sans">
      {/* Escena con los paneles encima; las gráficas debajo (al abrirlas la escena se encoge).
          En modo presentación solo quedan la reproducción y una tarjeta de valores. */}
      <main className="relative min-h-0 flex-1">
        <Escena />
        {presentacion ? (
          <TarjetaPresentacion />
        ) : (
          <>
            <SelectorVistas />
            <Avisos />
            <PanelParametros />
            <ValoresEnVivo />
          </>
        )}
        <BarraReproduccion />
      </main>
      {/* Oculta (no desmontada) en presentación: conserva pestaña, zoom y la medición cargada */}
      <div className={presentacion ? "hidden" : "contents"}>
        <Graficas />
      </div>
      <Ayuda />
      <PantallaCarga />
    </div>
  );
}
