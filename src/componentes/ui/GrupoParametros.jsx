/* Sección plegable del panel de parámetros. */
import { useState } from "react";
import Deslizador from "./Deslizador.jsx";
import Icono from "./Icono.jsx";

export default function GrupoParametros({ grupo }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <section className="border-b border-neutral-900/10 py-1.5 last:border-b-0">
      <button
        className="flex w-full items-center gap-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        <Icono nombre="abajo" className={"transition-transform " + (abierto ? "" : "-rotate-90")} />
        {grupo.nombre}
      </button>
      {abierto && grupo.parametros.map((nombre) => <Deslizador key={nombre} nombre={nombre} />)}
    </section>
  );
}
