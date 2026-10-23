/* Panel de vidrio a un lado de la escena, plegable a una pestaña vertical. */
import { MEDIDAS } from "./medidas.js";
import Icono from "./Icono.jsx";

export default function PanelLateral({ lado, titulo, ancho, abierto, onAlternar, children }) {
  const izquierda = lado === "izquierda";
  const posicion = { [izquierda ? "left" : "right"]: MEDIDAS.margen, top: MEDIDAS.margen };

  if (!abierto) {
    return (
      <button
        className="vidrio absolute flex flex-col items-center gap-2 px-2 py-3 text-xs font-medium text-neutral-700 hover:bg-white/90"
        style={{ ...posicion, width: MEDIDAS.anchoPlegado }}
        onClick={onAlternar}
        aria-expanded="false"
        title={`Mostrar ${titulo.toLowerCase()}`}
      >
        <Icono nombre={izquierda ? "derecha" : "izquierda"} />
        <span className="[writing-mode:vertical-rl]">{titulo}</span>
      </button>
    );
  }

  return (
    <aside
      className="vidrio absolute flex flex-col"
      style={{ ...posicion, bottom: MEDIDAS.margen, width: ancho }}
      aria-label={titulo}
    >
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-sm font-semibold text-neutral-900">{titulo}</h2>
        <button
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-900/5 hover:text-neutral-800"
          onClick={onAlternar}
          aria-expanded="true"
          title={`Plegar ${titulo.toLowerCase()}`}
        >
          <Icono nombre={izquierda ? "izquierda" : "derecha"} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">{children}</div>
    </aside>
  );
}
