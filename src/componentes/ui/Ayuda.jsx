/* Cuadro de ayuda (tecla H o ?): atajos de teclado, qué hace cada panel y el modelo de cada hito
   (adaptado del polipasto). */
import { usarGemelo } from "../../estado/usarGemelo.js";

const ATAJOS = [
  ["Espacio", "Reproducir / pausar"],
  ["R", "Reiniciar (t = 0)"],
  ["← →", "Retroceder / avanzar un paso (en pausa)"],
  ["1 a 5", "Vistas de cámara del hito activo"],
  ["Tab", "Cambiar de hito (Faraday-Lenz / Ampère)"],
  ["A", "Alternar Estudio / Análisis"],
  ["C", "Mostrar u ocultar las líneas de campo"],
  ["P", "Modo presentación (solo reproducción y valores clave)"],
  ["H o ?", "Mostrar u ocultar esta ayuda"],
  ["Esc", "Cerrar la ayuda o salir del modo presentación"],
  ["F", "Medidor de cuadros por segundo"],
];

const PANELES = [
  ["Parámetros (izquierda)", "Selector de hito, escenarios y parámetros de la bobina, el imán, el movimiento, el solenoide, el núcleo, el sensor, el circuito y la adquisición. Cada cambio recalcula la simulación sin reiniciar."],
  ["Valores en vivo (derecha)", "Variables del instante, derivados de los parámetros, resultados de las preguntas y controles del campo magnético (líneas, mapa de |B|, flechas y brújulas)."],
  ["Análisis (derecha, modo Análisis)", "La ley del hito sustituida con los números del instante y las preguntas del taller con los resultados del gemelo. En la escena: tensiones de los nodos, cotas, Lenz, corriente, diodo, H, M y B."],
  ["Vistas (arriba)", "Encuadres de cámara. Con el mouse: arrastrar gira, rueda acerca, clic derecho desplaza."],
  ["Reproducción (abajo)", "Play, reinicio, línea de tiempo, velocidad, bucle y, en el Hito 2, «PWM lento» para recorrer un periodo del PWM."],
  ["Gráficas (inferior)", "Curvas con cursor sincronizado; arrastrar mueve el tiempo y la rueda o Shift + arrastrar hace zoom. A la derecha, la validación con el CSV del Arduino, la tabla de errores y las exportaciones."],
];

export default function Ayuda() {
  const abierta = usarGemelo((s) => s.ayuda);
  const alternarAyuda = usarGemelo((s) => s.alternarAyuda);
  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/25 p-4" onClick={alternarAyuda}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ayuda"
        className="vidrio max-h-[90vh] w-[min(780px,100%)] overflow-y-auto p-6 text-[13px] text-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="titulo-ayuda" className="text-base font-semibold text-neutral-900">Ayuda</h2>
          <button className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-900/5" onClick={alternarAyuda} aria-label="Cerrar ayuda">
            Cerrar (Esc)
          </button>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Atajos de teclado</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              {ATAJOS.map(([tecla, accion]) => (
                <div key={tecla} className="contents">
                  <dt><kbd className="rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 font-mono text-[12px]">{tecla}</kbd></dt>
                  <dd className="text-neutral-700">{accion}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Paneles</h3>
            <dl className="mt-2 space-y-2">
              {PANELES.map(([nombre, texto]) => (
                <div key={nombre}>
                  <dt className="font-medium text-neutral-900">{nombre}</dt>
                  <dd className="text-neutral-600">{texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <div className="mt-4 space-y-1 border-t border-neutral-900/10 pt-3 text-[12px] text-neutral-500">
          <p>Hito 1: ε = −N dΦ/dt = −pol·(dΦ/dx)·v, con el flujo exacto del imán (lámina de corriente) por cada espira, muestreado por el ADC de 10 bits cada 2 ms con media móvil.</p>
          <p>Hito 2: PWM de 490 Hz en D9, circuito RL con TIP120 y diodo resuelto por RK4, núcleo con desmagnetización y saturación, y SS49E: V_hall = V_q + S·B.</p>
        </div>
      </div>
    </div>
  );
}
