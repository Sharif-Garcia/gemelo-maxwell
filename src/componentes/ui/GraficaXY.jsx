/* Gráfica XY con uPlot para lo que no va contra el tiempo (velocidades, B contra D, periodo PWM).
   Series de puntos o de líneas sobre un mismo x, una banda sombreada opcional y un marcador
   vertical del valor actual que sigue al reloj con una suscripción (sin renders por cuadro). */
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { usarGemelo } from "../../estado/usarGemelo.js";

const TINTA = "#52514e";
const REJILLA = "#e8e7e3";
const BANDA = "rgba(82, 81, 78, 0.08)";
const FUENTE = "11px Inter, system-ui, sans-serif";

const formatoPunto = (u, splits) => splits.map((v) => String(Number(v.toPrecision(6))));
const texto = (v, decimales) => (Number.isFinite(v) ? v.toFixed(decimales) : "—");

// Banda sombreada entre dos valores de x (por ejemplo, la zona donde la curva se aplana)
function dibujarBanda(u, banda) {
  if (!banda) return;
  const { ctx, bbox } = u;
  const x0 = u.valToPos(banda.desde, "x", true);
  const x1 = u.valToPos(banda.hasta, "x", true);
  ctx.save();
  ctx.fillStyle = BANDA;
  ctx.fillRect(Math.min(x0, x1), bbox.top, Math.abs(x1 - x0), bbox.height);
  if (banda.etiqueta) {
    ctx.font = `${10 * uPlot.pxRatio}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = TINTA;
    ctx.textBaseline = "top";
    ctx.fillText(banda.etiqueta, Math.min(x0, x1) + 4 * uPlot.pxRatio, bbox.top + 3 * uPlot.pxRatio);
  }
  ctx.restore();
}

/*
 * x: valores del eje x; series: [{ nombre, simbolo, unidad, color, y, modo: "linea" | "puntos",
 * trazo, decimales }]; marcador(estado): x del instante actual o null; banda: { desde, hasta, etiqueta }.
 */
export default function GraficaXY({ x, series, etiquetaX, etiquetaY, alto, marcador, banda }) {
  const contenedor = useRef(null);

  useEffect(() => {
    const opciones = {
      width: contenedor.current.clientWidth,
      height: alto,
      legend: { show: false },
      scales: {
        x: { time: false },
        y: { range: (u, min, max) => (min === max ? [min - 1, max + 1] : uPlot.rangeNum(min, max, 0.1, true)) },
      },
      cursor: { y: false, points: { show: false }, drag: { x: false, y: false, setScale: false } },
      axes: [
        {
          stroke: TINTA, font: FUENTE, labelFont: FUENTE, label: etiquetaX, labelSize: 18, labelGap: 2, size: 30,
          values: formatoPunto, grid: { stroke: REJILLA, width: 1 }, ticks: { stroke: REJILLA, width: 1 },
        },
        {
          stroke: TINTA, font: FUENTE, labelFont: FUENTE, label: etiquetaY, size: 56, labelSize: 16,
          values: formatoPunto, grid: { stroke: REJILLA, width: 1 }, ticks: { stroke: REJILLA, width: 1 },
        },
      ],
      series: [
        {},
        ...series.map((s) => (s.modo === "puntos"
          ? { label: s.simbolo, stroke: s.color, width: 0, paths: () => null, points: { show: true, size: 8, fill: s.color, stroke: "#ffffff", width: 2 } }
          : { label: s.simbolo, stroke: s.color, width: 2, dash: s.trazo, points: { show: false } })),
      ],
      hooks: { drawClear: [(u) => dibujarBanda(u, banda)] },
    };
    const u = new uPlot(opciones, [x, ...series.map((s) => s.y)], contenedor.current);

    // Marcador del valor actual
    const linea = document.createElement("div");
    linea.className = "pointer-events-none absolute top-0 h-full w-px bg-neutral-800/70";
    u.over.append(linea);
    const ubicar = (estado) => {
      const valor = marcador?.(estado);
      const visible = Number.isFinite(valor) && valor >= u.scales.x.min && valor <= u.scales.x.max;
      linea.style.display = visible ? "" : "none";
      if (visible) linea.style.transform = `translateX(${u.valToPos(valor, "x")}px)`;
    };
    ubicar(usarGemelo.getState());
    const desuscribir = usarGemelo.subscribe(ubicar);

    const observador = new ResizeObserver(() => {
      u.setSize({ width: contenedor.current.clientWidth, height: u.height });
      ubicar(usarGemelo.getState());
    });
    observador.observe(contenedor.current);

    return () => {
      observador.disconnect();
      desuscribir();
      u.destroy();
    };
  }, [x, series, etiquetaX, etiquetaY, alto, marcador, banda]);

  return (
    <div className="min-w-0">
      <div className="flex h-5 items-center gap-5 pl-[56px] text-xs">
        {series.map((s) => (
          <div key={s.nombre} className="flex items-center gap-1.5">
            <svg width="16" height="8" className="shrink-0" aria-hidden="true">
              {s.modo === "puntos"
                ? <circle cx="8" cy="4" r="3.5" fill={s.color} />
                : <line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.trazo?.join(" ")} strokeLinecap="round" />}
            </svg>
            <span className="text-neutral-600">{s.nombre}</span>
            {s.valor !== undefined && (
              <span className="font-mono tabular-nums text-neutral-900">{texto(s.valor, s.decimales ?? 3)} <span className="text-neutral-500">{s.unidad}</span></span>
            )}
          </div>
        ))}
      </div>
      <div ref={contenedor} className="relative min-w-0" />
    </div>
  );
}
