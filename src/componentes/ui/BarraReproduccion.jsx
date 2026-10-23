/* Barra de reproducción (adaptada del polipasto): reiniciar, play/pausa, línea de tiempo
   arrastrable, tiempo actual en las unidades del hito, velocidades del hito, bucle y, en el
   Hito 2, la cámara lenta del PWM; al final, modo presentación y ayuda. La línea y el tiempo se
   mueven en el DOM con una suscripción. */
import { useEffect, useRef } from "react";
import { usarGemelo, VELOCIDADES, duracion } from "../../estado/usarGemelo.js";
import { TIEMPO } from "../../graficas/series.js";
import { MEDIDAS, bordesLaterales } from "./medidas.js";
import Icono from "./Icono.jsx";

const botonIcono = "flex size-8 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-900/5 hover:text-neutral-950";

export default function BarraReproduccion() {
  const hito = usarGemelo((s) => s.hito);
  const reproduciendo = usarGemelo((s) => s.reproduciendo);
  const velocidad = usarGemelo((s) => s.velocidad);
  const bucle = usarGemelo((s) => s.bucle);
  const camaraLenta = usarGemelo((s) => s.camaraLentaPWM);
  const tf = usarGemelo((s) => duracion(s.sim));
  const paneles = usarGemelo((s) => s.paneles);
  const presentacion = usarGemelo((s) => s.presentacion);
  const acciones = usarGemelo.getState();
  const linea = useRef(null);
  const tiempo = useRef(null);
  const arrastre = useRef(null);
  const { escala, unidad } = TIEMPO[hito];

  useEffect(() => {
    const pintar = (s) => {
      if (s.hito !== hito) return;
      if (linea.current) linea.current.value = s.t;
      if (tiempo.current) tiempo.current.textContent = (s.t * escala).toFixed(2);
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [hito, tf, escala]);

  const { izquierda, derecha } = bordesLaterales(paneles, presentacion);

  return (
    <div
      className="vidrio absolute flex items-center gap-2 px-2"
      style={{ left: izquierda, right: derecha, bottom: MEDIDAS.margen, height: MEDIDAS.altoReproduccion }}
      role="toolbar"
      aria-label="Reproducción"
    >
      <button className={botonIcono} onClick={acciones.reiniciar} title="Reiniciar (R)" aria-label="Reiniciar">
        <Icono nombre="reiniciar" />
      </button>
      <button
        className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow hover:bg-neutral-700"
        onClick={acciones.alternarReproduccion}
        title={reproduciendo ? "Pausa (espacio)" : "Reproducir (espacio)"}
        aria-label={reproduciendo ? "Pausa" : "Reproducir"}
      >
        <Icono nombre={reproduciendo ? "pausa" : "play"} />
      </button>

      <div className="flex shrink-0 items-baseline gap-1 pl-1 font-mono text-[13px] tabular-nums">
        <span ref={tiempo} className="w-[3.6rem] text-right text-neutral-900" />
        <span className="text-neutral-400">/ {(tf * escala).toFixed(hito === 1 ? 0 : 1)} {unidad}</span>
      </div>

      <input
        ref={linea}
        type="range"
        min={0}
        max={tf}
        step={tf / 2000}
        defaultValue={0}
        className="mx-1 h-1.5 min-w-0 flex-1 cursor-pointer"
        aria-label="Línea de tiempo"
        onPointerDown={() => {
          arrastre.current = usarGemelo.getState().reproduciendo;
          acciones.pausa();
        }}
        onInput={(e) => acciones.irA(Number(e.target.value))}
        onPointerUp={() => {
          if (arrastre.current) acciones.play();
          arrastre.current = null;
        }}
      />

      <div className="flex shrink-0 rounded-lg bg-neutral-900/5 p-0.5" role="group" aria-label="Velocidad">
        {VELOCIDADES[hito].map((v) => (
          <button
            key={v}
            onClick={() => acciones.setVelocidad(v)}
            aria-pressed={v === velocidad}
            className={
              "rounded-md px-1.5 py-0.5 font-mono text-[12px] tabular-nums " +
              (v === velocidad ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-900")
            }
          >
            {v}×
          </button>
        ))}
      </div>
      <button
        className={botonIcono + (bucle ? " bg-neutral-900/10 text-neutral-950" : "")}
        onClick={() => acciones.setBucle(!bucle)}
        aria-pressed={bucle}
        title="Repetir en bucle"
        aria-label="Bucle"
      >
        <Icono nombre="bucle" />
      </button>
      {hito === 2 && (
        <button
          className={"flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12px] " +
            (camaraLenta ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900/5")}
          onClick={acciones.alternarCamaraLentaPWM}
          aria-pressed={camaraLenta}
          aria-label="PWM lento"
          title="Recorre un periodo del PWM a 0.001×: conmutación, diodo y rizado de la corriente"
        >
          <Icono nombre="pwm" />
          PWM lento
        </button>
      )}
      <span className="mx-1 h-6 w-px shrink-0 bg-neutral-900/10" aria-hidden="true" />
      <button
        className={botonIcono + " shrink-0" + (presentacion ? " bg-neutral-900/10" : "")}
        onClick={acciones.alternarPresentacion}
        aria-pressed={presentacion}
        title={presentacion ? "Salir del modo presentación (P)" : "Modo presentación (P)"}
        aria-label="Modo presentación"
      >
        <Icono nombre="pantalla" />
      </button>
      <button className={botonIcono + " shrink-0 text-[14px] font-semibold"} onClick={acciones.alternarAyuda} title="Ayuda (H o ?)" aria-label="Ayuda">
        ?
      </button>
    </div>
  );
}
