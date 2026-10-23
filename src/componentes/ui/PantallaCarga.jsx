/* Pantalla de carga con el título del proyecto y una barra de progreso real (copiada del
   polipasto): recursos 3D (HDR del estudio, vía el LoadingManager de three: useProgress),
   tipografías de la interfaz (document.fonts) y primer cuadro dibujado (PrimerCuadro). */
import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";

const PESOS = { recursos: 70, fuentes: 15, escena: 15 };   // % de la barra

export default function PantallaCarga() {
  const { progress, item, total, loaded } = useProgress();
  const escenaLista = usarGemelo((s) => s.escenaLista);
  const [fuentes, setFuentes] = useState(false);
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFuentes(true));
  }, []);

  const recursosListos = total > 0 && loaded === total;
  const lista = escenaLista && fuentes;
  const porcentaje = Math.round(
    (recursosListos || escenaLista ? 100 : progress) * (PESOS.recursos / 100)
    + (fuentes ? PESOS.fuentes : 0)
    + (escenaLista ? PESOS.escena : 0),
  );

  useEffect(() => {
    if (!lista) return undefined;
    const id = setTimeout(() => setOculta(true), 600);   // deja ver el 100 % y el desvanecido
    return () => clearTimeout(id);
  }, [lista]);

  if (oculta) return null;

  let paso = "Preparando la escena…";
  if (!recursosListos && !escenaLista) paso = `Cargando ${item ? item.split("/").pop() : "recursos 3D"}…`;
  else if (!fuentes) paso = "Cargando tipografías…";

  return (
    <div
      className={"fixed inset-0 z-50 flex items-center justify-center bg-[#eeeeef] transition-opacity duration-500 " +
        (lista ? "pointer-events-none opacity-0" : "opacity-100")}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      aria-label="Cargando el gemelo digital"
    >
      <div className="w-[min(560px,88vw)] text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Universidad Popular del Cesar · Modelado y Simulación
        </p>
        <h1 className="mt-3 text-[28px] font-semibold leading-tight text-neutral-900">
          Gemelo digital de las leyes de Maxwell
        </h1>
        <p className="mt-2 text-[14px] text-neutral-600">Faraday-Lenz (radar inductivo) y Ampère (electroimán con PWM)</p>
        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-neutral-900/10">
          <div className="h-full rounded-full bg-neutral-900 transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-neutral-500">
          <span>{paso}</span>
          <span className="font-mono tabular-nums">{porcentaje} %</span>
        </div>
      </div>
    </div>
  );
}
