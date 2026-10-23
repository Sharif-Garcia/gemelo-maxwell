/* Gráfica contra el tiempo con uPlot (adaptada del polipasto).
   - Se crea una sola vez; los datos y el zoom se actualizan con setData/setScale.
   - El cursor de reproducción (línea y puntos) y los valores en vivo se mueven en el DOM con una
     suscripción al estado: sin renders de React por cuadro.
   - Arrastrar mueve el tiempo (pausando la reproducción); Shift + arrastrar o la rueda hacen zoom
     en el tiempo (onZoom).
   - El eje del tiempo está en las unidades del hito (ms en el Hito 1, s en el Hito 2). */
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { VARIABLES, TIEMPO, etiquetaEje, zoomRueda, acotarRango, filasEtiquetas } from "../../graficas/series.js";

const TINTA = "#52514e";        // texto secundario
const REJILLA = "#e8e7e3";      // un paso sobre la superficie
const MARCA = "#b3b1aa";
const FUENTE = "11px Inter, system-ui, sans-serif";
const FACTOR_RUEDA = 1.15;

// Valor con el formato de la variable; sin dato se muestra una raya
const texto = (v, decimales) => (Number.isFinite(v) ? v.toFixed(decimales) : "—");

// Marcas de los ejes con punto decimal, como el resto de la interfaz
const formatoPunto = (u, splits) => splits.map((v) => String(Number(v.toPrecision(6))));

// Líneas verticales finas en los eventos, con etiqueta opcional; las encimadas bajan de fila
function dibujarMarcas(u, marcas, conEtiqueta) {
  const { ctx, bbox } = u;
  const pr = uPlot.pxRatio;
  ctx.save();
  ctx.setLineDash([]);
  ctx.font = `${10 * pr}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.strokeStyle = MARCA;
  ctx.lineWidth = pr;
  const visibles = marcas
    .filter((m) => m.t >= u.scales.x.min && m.t <= u.scales.x.max)
    .map((m) => ({ ...m, x: Math.round(u.valToPos(m.t, "x", true)) + 0.5 }));
  for (const m of visibles) {
    ctx.beginPath();
    ctx.moveTo(m.x, bbox.top);
    ctx.lineTo(m.x, bbox.top + bbox.height);
    ctx.stroke();
  }
  if (conEtiqueta) {
    const textos = visibles.map((m) => ({ x: m.x + 4 * pr, ancho: ctx.measureText(m.etiqueta).width }));
    const filas = filasEtiquetas(textos, 12 * pr);
    ctx.fillStyle = TINTA;
    visibles.forEach((m, i) => ctx.fillText(m.etiqueta, textos[i].x, bbox.top + (2 + filas[i] * 13) * pr));
  }
  ctx.restore();
}

export default function GraficaUPlot({
  hito, claves, datos, marcas, rango, alto, ejeTiempo = true, etiquetasMarcas = true, compacta = false, onZoom,
}) {
  const contenedor = useRef(null);
  const leyenda = useRef(null);
  const plot = useRef(null);
  const pintar = useRef(() => {});
  const ultimos = useRef({ datos, marcas, onZoom, alto });

  useEffect(() => {
    ultimos.current = { datos, marcas, onZoom, alto };
  });

  // Creación (solo cambia si cambian el hito, las variables o el eje del tiempo)
  const clave = claves.join(",");
  useEffect(() => {
    const claveLista = clave.split(",");
    const vars = claveLista.map((c) => VARIABLES[hito][c]);
    const { escala, unidad, rangoMinimo } = TIEMPO[hito];
    let arrastre = null;
    let mostrarAyuda = () => {};
    const opciones = {
      width: contenedor.current.clientWidth,
      height: ultimos.current.alto,
      legend: { show: false },
      scales: {
        x: { time: false },
        // Una serie constante se centra con ±1 en vez de 0 a 100
        y: { range: (u, min, max) => (min === max ? [min - 1, max + 1] : uPlot.rangeNum(min, max, 0.1, true)) },
      },
      cursor: { y: false, points: { show: false }, drag: { x: false, y: false, setScale: false } },
      axes: [
        {
          stroke: TINTA, font: FUENTE, labelFont: FUENTE,
          grid: { stroke: REJILLA, width: 1 }, ticks: { stroke: REJILLA, width: 1 },
          label: ejeTiempo ? `t [${unidad}]` : undefined,
          labelSize: ejeTiempo ? 18 : 0,
          labelGap: 2,
          size: ejeTiempo ? 30 : 6,
          values: ejeTiempo ? formatoPunto : (u, splits) => splits.map(() => ""),
        },
        {
          stroke: TINTA, font: FUENTE, labelFont: FUENTE, size: 56, labelSize: 16,
          space: compacta ? 16 : 30, values: formatoPunto,
          label: etiquetaEje(hito, claveLista),
          grid: { stroke: REJILLA, width: 1 }, ticks: { stroke: REJILLA, width: 1 },
        },
      ],
      series: [{}, ...vars.map((v) => ({ label: v.simbolo, stroke: v.color, width: 2, dash: v.trazo, points: { show: false } }))],
      hooks: {
        draw: [(u) => dibujarMarcas(u, ultimos.current.marcas, etiquetasMarcas)],
        setScale: [() => pintar.current(usarGemelo.getState())],
        setSize: [() => pintar.current(usarGemelo.getState())],
        setCursor: [(uu) => mostrarAyuda(uu)],
      },
    };
    const u = new uPlot(opciones, ultimos.current.datos, contenedor.current);
    plot.current = u;

    // Capas del cursor de reproducción dentro del área de trazado
    const linea = document.createElement("div");
    linea.className = "pointer-events-none absolute top-0 h-full w-px bg-neutral-800/70";
    const puntos = vars.map((v) => {
      const p = document.createElement("div");
      p.className = "pointer-events-none absolute -ml-[5px] -mt-[5px] size-[10px] rounded-full ring-2 ring-white";
      p.style.background = v.color;
      return p;
    });
    const ayuda = document.createElement("div");
    ayuda.className = "pointer-events-none absolute top-1 hidden rounded-md bg-white/95 px-2 py-1 font-mono text-[11px] text-neutral-700 shadow";
    u.over.append(linea, ...puntos, ayuda);

    // Cursor de reproducción y valores en vivo (DOM directo); solo con el hito de la gráfica activo
    const celdas = leyenda.current.querySelectorAll("[data-valor]");
    pintar.current = ({ hito: hitoActivo, t, indice }) => {
      if (hitoActivo !== hito) return;
      const d = u.data;
      const tEje = t * escala;
      const x = u.valToPos(tEje, "x");
      const visible = tEje >= u.scales.x.min && tEje <= u.scales.x.max;
      linea.style.display = visible ? "" : "none";
      linea.style.transform = `translateX(${x}px)`;
      vars.forEach((v, k) => {
        const valor = d[k + 1][indice];
        // La medición no cubre todo el tiempo del gemelo: sin dato no hay punto
        puntos[k].style.display = visible && Number.isFinite(valor) ? "" : "none";
        puntos[k].style.transform = `translate(${x}px, ${u.valToPos(valor, "y")}px)`;
        if (celdas[k]) celdas[k].textContent = texto(valor, v.decimales);
      });
    };
    pintar.current(usarGemelo.getState());
    const desuscribir = usarGemelo.subscribe(pintar.current);

    // Valores bajo el puntero
    mostrarAyuda = (uu) => {
      const i = uu.cursor.idx;
      if (i == null || arrastre) {
        ayuda.classList.add("hidden");
        return;
      }
      ayuda.classList.remove("hidden");
      const lineas = [`t = ${uu.data[0][i].toFixed(hito === 1 ? 2 : 3)} ${unidad}`]
        .concat(vars.map((v, k) => `${v.simbolo} = ${texto(uu.data[k + 1][i], v.decimales)} ${v.unidad}`));
      ayuda.textContent = lineas.join("   ");
      const izquierda = uu.cursor.left > uu.over.clientWidth / 2;
      ayuda.style.left = izquierda ? "" : `${uu.cursor.left + 10}px`;
      ayuda.style.right = izquierda ? `${uu.over.clientWidth - uu.cursor.left + 10}px` : "";
    };

    // Arrastrar: mover el tiempo. Shift + arrastrar: seleccionar rango. Rueda: zoom.
    const fin = () => u.data[0][u.data[0].length - 1];
    const tiempoEn = (e) => u.posToVal(e.clientX - u.over.getBoundingClientRect().left, "x");
    const xEn = (e) => e.clientX - u.over.getBoundingClientRect().left;
    const irA = (tEje) => usarGemelo.getState().irA(tEje / escala);
    const alPresionar = (e) => {
      if (e.button !== 0) return;
      u.over.setPointerCapture(e.pointerId);
      const estado = usarGemelo.getState();
      if (e.shiftKey) {
        arrastre = { tipo: "rango", x0: xEn(e) };
      } else {
        arrastre = { tipo: "tiempo", reproducia: estado.reproduciendo };
        estado.pausa();
        irA(tiempoEn(e));
      }
    };
    const alMover = (e) => {
      if (!arrastre) return;
      if (arrastre.tipo === "tiempo") {
        irA(tiempoEn(e));
      } else {
        const x = xEn(e);
        u.setSelect({ left: Math.min(x, arrastre.x0), width: Math.abs(x - arrastre.x0), top: 0, height: u.over.clientHeight }, false);
      }
    };
    const alSoltar = (e) => {
      if (!arrastre) return;
      if (arrastre.tipo === "tiempo") {
        if (arrastre.reproducia) usarGemelo.getState().play();
      } else {
        const x = xEn(e);
        if (Math.abs(x - arrastre.x0) > 4) {
          const a = u.posToVal(arrastre.x0, "x");
          const b = u.posToVal(x, "x");
          ultimos.current.onZoom?.(acotarRango(a, b, fin(), rangoMinimo));
        }
        u.setSelect({ left: 0, width: 0, top: 0, height: 0 }, false);
      }
      arrastre = null;
    };
    const alGirar = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? FACTOR_RUEDA : 1 / FACTOR_RUEDA;
      ultimos.current.onZoom?.(zoomRueda({ min: u.scales.x.min, max: u.scales.x.max }, tiempoEn(e), factor, fin(), rangoMinimo));
    };
    u.over.addEventListener("pointerdown", alPresionar);
    u.over.addEventListener("pointermove", alMover);
    u.over.addEventListener("pointerup", alSoltar);
    u.over.addEventListener("pointercancel", alSoltar);
    u.over.addEventListener("wheel", alGirar, { passive: false });
    u.over.style.cursor = "ew-resize";

    // Ancho según el contenedor
    const observador = new ResizeObserver(() => {
      u.setSize({ width: contenedor.current.clientWidth, height: u.height });
    });
    observador.observe(contenedor.current);

    return () => {
      observador.disconnect();
      desuscribir();
      u.destroy();
      plot.current = null;
    };
    // alto, datos y rango se aplican en sus propios efectos
  }, [hito, clave, ejeTiempo, etiquetasMarcas, compacta]);

  // Datos nuevos (al mover un parámetro): sin recrear la gráfica ni perder el zoom
  useEffect(() => {
    const u = plot.current;
    if (!u || datos.every((serie, k) => serie === u.data[k])) return;
    u.batch(() => {
      u.setData(datos, true);
      if (rango) u.setScale("x", rango);
    });
    pintar.current(usarGemelo.getState());
  }, [datos, rango]);

  // Zoom del eje del tiempo (compartido entre gráficas apiladas)
  useEffect(() => {
    const u = plot.current;
    if (!u) return;
    u.setScale("x", rango ?? { min: u.data[0][0], max: u.data[0][u.data[0].length - 1] });
  }, [rango]);

  useEffect(() => {
    const u = plot.current;
    if (u && u.height !== alto) u.setSize({ width: u.width, height: alto });
  }, [alto]);

  useEffect(() => {
    plot.current?.redraw(false, false);   // marcas nuevas
  }, [marcas]);

  return (
    <div className="min-w-0">
      {/* Leyenda compacta: color, nombre y valor en el t actual */}
      <div ref={leyenda} className="flex h-5 items-center gap-5 pl-[56px] text-xs">
        {claves.map((c) => {
          const v = VARIABLES[hito][c];
          return (
            <div key={c} className="flex items-center gap-1.5">
              <svg width="16" height="6" className="shrink-0" aria-hidden="true">
                <line x1="0" y1="3" x2="16" y2="3" stroke={v.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={v.trazo?.join(" ")} />
              </svg>
              <span className="text-neutral-600">{v.nombre} {v.simbolo}</span>
              <span className="min-w-[4.5rem] text-right font-mono tabular-nums text-neutral-900" data-valor="" />
              <span className="text-neutral-500">{v.unidad}</span>
            </div>
          );
        })}
      </div>
      <div ref={contenedor} className="relative min-w-0" />
    </div>
  );
}
