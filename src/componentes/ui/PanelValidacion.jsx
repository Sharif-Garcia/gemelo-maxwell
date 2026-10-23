/* Validación con el Arduino (adaptado del polipasto): carga del CSV (arrastrar, elegir o un
   ejemplo sintético), ajuste del pulso en el Hito 1, tabla comparativa gemelo contra medición
   con su error y exportaciones (CSV del gemelo y captura PNG). */
import { useMemo, useRef, useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { validarHito1, validarHito2 } from "../../utilidades/validacion.js";
import { escribirCSV } from "../../utilidades/csv.js";
import { ejemplo } from "../../utilidades/ejemplos.js";
import { descargarTexto } from "../../utilidades/descargas.js";
import Icono from "./Icono.jsx";

const boton = "rounded-lg border border-neutral-300/80 bg-white/80 px-2.5 py-1 text-xs text-neutral-800 hover:bg-white disabled:opacity-40";
const ENCABEZADO = { 1: "Tiempo,Voltaje", 2: "CicloTrabajo_PWM,Voltaje_Hall" };
const X0_MIN = -0.14;   // la caída más alta que cabe en el tubo [m]

// Decimales por unidad para la tabla
const DECIMALES = { V: 3, ms: 2, "mV·s": 3, "mT/%": 4, mT: 3, "": 4 };
const numero = (v, unidad) => (Number.isFinite(v) ? v.toFixed(DECIMALES[unidad] ?? 3) : "—");
const conSigno = (texto) => (texto.startsWith("-") || texto === "—" ? texto : `+${texto}`);
function textoError(f) {
  if (f.error === null) return "—";
  return f.diferencia ? conSigno(numero(f.error, f.unidad)) : `${conSigno(f.error.toFixed(1))} %`;
}

// Tabla separada por tabuladores: se pega como tabla en Word, Docs o una hoja de cálculo
function tablaTexto(filas) {
  const lineas = [["Magnitud", "Gemelo", "Medido", "Error"].join("\t")];
  for (const f of filas) {
    const nombre = f.unidad ? `${f.nombre} [${f.unidad}]` : f.nombre;
    lineas.push([nombre, numero(f.gemelo, f.unidad), numero(f.medido, f.unidad), textoError(f)].join("\t"));
  }
  return lineas.join("\n");
}

function Ajuste({ ajuste, parametros }) {
  const { ajustarMedicion, aplicarAjuste } = usarGemelo.getState();
  if (!ajuste) {
    return (
      <div className="flex items-center gap-2">
        <button className={boton} onClick={ajustarMedicion}>Ajustar el pulso</button>
        <span className="text-[11.5px] text-neutral-500">velocidad, cruce y polaridad por mínimos cuadrados</span>
      </div>
    );
  }
  if (!ajuste.ok) return <p className="text-[11.5px] text-amber-800">{ajuste.motivo}</p>;
  const caida = ajuste.tipo === "caida";
  const aplicado = parametros.pol === ajuste.pol &&
    (caida ? Math.abs(parametros.x0 - Math.max(X0_MIN, ajuste.x0)) < 0.6e-3 : Math.abs(parametros.v - ajuste.v_centro) < 0.006);
  return (
    <div className="rounded-lg bg-neutral-900/[0.04] px-2.5 py-1.5">
      <p className="font-mono text-[11.5px] tabular-nums text-neutral-800">
        v_c = {ajuste.v_centro.toFixed(3)} m/s{caida && <> · x0 = {(ajuste.x0 * 1e3).toFixed(1)} mm</>} · cruce {(ajuste.t_cruce * 1e3).toFixed(1)} ms · pol {ajuste.pol > 0 ? "+1" : "−1"} · R² {ajuste.r2.toFixed(3)}
      </p>
      {caida && ajuste.x0 < X0_MIN && (
        <p className="mt-0.5 text-[11.5px] text-amber-800">
          Esa caída no cabe en el tubo: se usará x0 = {X0_MIN * 1e3} mm. Con movimiento constante se ajusta cualquier velocidad.
        </p>
      )}
      <div className="mt-1 flex gap-2">
        <button className={boton} onClick={aplicarAjuste} disabled={aplicado}>{aplicado ? "Aplicado al gemelo" : "Aplicar al gemelo"}</button>
        <button className={boton} onClick={ajustarMedicion}>Reajustar</button>
      </div>
    </div>
  );
}

export default function PanelValidacion() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const parametros = usarGemelo((s) => s.parametros);
  const medicion = usarGemelo((s) => s.medicion);
  const errores = usarGemelo((s) => s.erroresMedicion);
  const { cargarMedicion, quitarMedicion, capturarEscena } = usarGemelo.getState();
  const [encima, setEncima] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const selector = useRef(null);

  const ajuste = medicion?.ajuste ?? null;
  const resultado = useMemo(() => {
    if (!medicion || medicion.datos.hito !== hito) return null;
    return hito === 1 ? validarHito1(sim, medicion.datos, ajuste?.ok ? ajuste : null) : validarHito2(sim, medicion.datos);
  }, [hito, sim, medicion, ajuste]);

  const leerArchivo = async (archivo) => {
    if (archivo) cargarMedicion(await archivo.text(), archivo.name);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(tablaTexto(resultado.filas));
      setCopiada(true);
      setTimeout(() => setCopiada(false), 1500);
    } catch {
      setCopiada(false);
    }
  };
  const datos = medicion?.datos;

  return (
    <aside
      className={"flex max-h-[270px] w-[350px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-neutral-900/10 pl-4 text-[12.5px] " +
        (encima ? "bg-sky-50/60" : "")}
      aria-label="Validación con el Arduino"
      onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); leerArchivo(e.dataTransfer.files[0]); }}
    >
      <h3 className="text-sm font-semibold text-neutral-900">Validación con el Arduino</h3>

      {!medicion && (
        <div className="rounded-xl border border-dashed border-neutral-400/70 bg-white/50 px-3 py-2.5 text-center text-neutral-600">
          <p>Arrastra aquí el CSV del Arduino (<span className="font-mono">{ENCABEZADO[hito]}</span>)</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button className={boton} onClick={() => selector.current?.click()}>Elegir archivo</button>
            <button className={boton} onClick={() => cargarMedicion(ejemplo(hito), `ejemplo_sintetico_hito${hito}.csv`)}
              title="Generado por el gemelo con otros parámetros, para probar la validación">
              Cargar ejemplo sintético
            </button>
          </div>
          <input ref={selector} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden"
            onChange={(e) => { leerArchivo(e.target.files[0]); e.target.value = ""; }} />
        </div>
      )}

      {errores && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-red-900">
          <p className="font-medium">El archivo no es válido:</p>
          <ul className="mt-1 list-disc pl-4">{errores.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {medicion && (
        <>
          <div className="flex items-center gap-2 text-[11.5px] text-neutral-500">
            <span className="min-w-0 truncate" title={medicion.nombre}>
              {medicion.nombre} · {datos.filas} filas · {datos.esCodigo ? "código ADC" : "voltios"}
              {hito === 1 ? ` · tiempo en ${datos.unidadTiempo}` : ` · ciclo ${datos.cicloEn255 ? "0 a 255" : "en %"}`}
            </span>
            <button className="ml-auto shrink-0 underline hover:text-neutral-800" onClick={quitarMedicion}>Quitar</button>
          </div>
          {datos.avisos.map((a) => <p key={a} className="text-[11.5px] text-amber-800">{a}</p>)}
          {hito === 1 && <Ajuste ajuste={ajuste} parametros={parametros} />}
        </>
      )}

      {resultado && !resultado.ok && resultado.motivo && (
        <p className="flex items-center gap-1.5 text-amber-900"><Icono nombre="alerta" className="text-amber-600" />{resultado.motivo}</p>
      )}

      {resultado?.filas && (
        <>
          <table className="w-full text-right font-mono text-[12px] tabular-nums">
            <thead className="font-sans text-[11px] text-neutral-500">
              <tr>
                <th className="text-left font-medium">Magnitud</th>
                <th className="font-medium">Gemelo</th>
                <th className="font-medium">Medido</th>
                <th className="font-medium" title="Porcentaje del valor medido; en las filas que esperan un valor cercano a cero, la diferencia">Error</th>
              </tr>
            </thead>
            <tbody>
              {resultado.filas.map((f) => (
                <tr key={f.nombre}>
                  <td className="text-left font-sans text-neutral-700">
                    {f.nombre} {f.unidad && <span className="text-[11px] text-neutral-500">[{f.unidad}]</span>}
                  </td>
                  <td>{numero(f.gemelo, f.unidad)}</td>
                  <td>{numero(f.medido, f.unidad)}</td>
                  <td className="font-semibold">{textoError(f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-mono text-[11.5px] tabular-nums text-neutral-700">
            RMS {(resultado.rms * 1e3).toFixed(1)} mV · RMS normalizado {(resultado.nrmse * 100).toFixed(1)} % · R² {resultado.r2.toFixed(3)}
            <span className="font-sans text-neutral-500"> ({hito === 1 ? "FEM punto a punto" : "V_hall por paso"})</span>
          </p>
          <div>
            <button className={boton} onClick={copiar}>{copiada ? "Tabla copiada" : "Copiar tabla para el informe"}</button>
          </div>
        </>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-900/10 pt-2">
        <button className={boton} onClick={() => descargarTexto(escribirCSV(hito, sim), `gemelo_hito${hito}.csv`)}>
          Descargar CSV del gemelo
        </button>
        <button className={boton} onClick={capturarEscena} title="PNG de 1920 × 1080 con la cámara actual">
          Capturar escena (PNG)
        </button>
      </div>
    </aside>
  );
}
