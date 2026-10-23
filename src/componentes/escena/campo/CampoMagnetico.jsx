/* Campo magnético del hito activo: líneas con flujo animado, mapa de calor en el plano de corte,
   flechas y brújulas (combinables, opciones en usarGemelo.campo).
   - Líneas y mapa se construyen en un marco local con origen 0 y un grupo los ubica en el centro de
     la fuente: en el Hito 1 el grupo sigue al imán en cada cuadro; en el Hito 2 se ubica en el
     centro del núcleo (mover el perno no recalcula geometría).
   - Hito 1: el campo es el del imán; las sondas, fijas alrededor de la bobina, se recalculan en
     cada cuadro.
   - Hito 2: el campo es I·b_bob + M·b_nuc; la forma se calcula con el paso de referencia y en cada
     cuadro se escala con la corriente del barrido. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { useLineasCampo } from "../../../hooks/useLineasCampo.js";
import { configuracionLineas, factorIntensidad, instantePWM, laminasHito1, laminasHito2 } from "../../../fisica/campoHitos.js";
import { crearCampo } from "../../../fisica/lineasCampo.js";
import { crearRejilla, rejillasAmpere } from "../../../fisica/rejillaCampo.js";
import { crearMarco, marcoHito1, marcoHito2, puntosSondaHito1, puntosSondaHito2 } from "../../../geometria/marcoCampo.js";
import { alturaImanEnTubo } from "../../../geometria/montajeHito1.js";
import { colocacionPerno } from "../../../geometria/montajeHito2.js";
import { escalaLog, posicionEscala } from "./rampa.js";
import LineasCampo from "./LineasCampo.jsx";
import MapaCalor from "./MapaCalor.jsx";
import SondasCampo from "./SondasCampo.jsx";

const LIMITES_MAPA_1 = { rhoMax: 0.05, zMin: -0.06, zMax: 0.06 };

// Marcos con origen 0 (las orientaciones de marcoHito1 y marcoHito2)
const MARCOS_LOCALES = {
  1: crearMarco([0, 0, 0], marcoHito1().eje, marcoHito1().e1),
  2: crearMarco([0, 0, 0], [1, 0, 0], [0, 1, 0]),
};

// Dirección unitaria y posición en la escala de un vector de campo [T] (sin campo: a lo largo del eje)
function muestra(v, eje, escala) {
  const m = Math.hypot(...v);
  if (!(m > 0)) return { x: eje[0], y: eje[1], z: eje[2], t: 0 };
  return { x: v[0] / m, y: v[1] / m, z: v[2] / m, t: posicionEscala(m, escala) };
}

export default function CampoMagnetico() {
  const hito = usarGemelo((s) => s.hito);
  const sim = usarGemelo((s) => s.sim);
  const campo = usarGemelo((s) => s.campo);
  // En equipos lentos (calidad baja) se trazan menos líneas y menos planos
  const baja = usarGemelo((s) => s.calidad === "baja");
  const opciones = useMemo(
    () => (baja ? { ...campo, nLineas: Math.min(campo.nLineas, 5), nPlanos: Math.min(campo.nPlanos, 4) } : campo),
    [campo, baja],
  );
  const grupo = useRef(null);

  const config = useMemo(() => configuracionLineas(hito, sim, opciones.nLineas), [hito, sim, opciones.nLineas]);
  const calculadas = useLineasCampo(config);
  // Las líneas de otro hito (mientras se calculan las nuevas) no se muestran
  const lineas = calculadas?.clave?.startsWith(`${hito}|`) ? calculadas : null;

  const marcoLocal = MARCOS_LOCALES[hito];
  const perno = useMemo(() => (hito === 2 ? colocacionPerno(sim.p) : null), [hito, sim]);
  const marcoMundo2 = useMemo(() => (perno ? marcoHito2(perno) : null), [perno]);

  // Escala de color: del campo más intenso sobre las líneas (o de la fuente, si aún no hay líneas)
  const escala = useMemo(() => escalaLog(lineas?.Bmax ?? (hito === 1 ? 0.6 : 0.08)), [lineas, hito]);
  useEffect(() => usarGemelo.setState({ escalaCampo: escala }), [escala]);

  // Rejillas base del mapa de calor (escala: de T a mT por la unidad del uniforme)
  const mapa = useMemo(() => {
    if (!opciones.mapa) return null;
    if (hito === 1) {
      const rejilla = crearRejilla(laminasHito1(sim.p), { ...LIMITES_MAPA_1, nRho: 64, nZ: 154 });
      return { bases: [{ rejilla, escala: 1e3 }], limites: LIMITES_MAPA_1, clave: config.clave };
    }
    const { dominio } = config.opciones;
    const limites = { rhoMax: Math.min(dominio.rhoMax, 0.04), zMin: dominio.zMin, zMax: dominio.zMax };
    const { bob, nuc } = rejillasAmpere(sim.d.fuentes, { ...limites, nRho: 96, nZ: 192 });
    return { bases: [{ rejilla: bob, escala: 1e3 }, { rejilla: nuc, escala: 1e6 }], limites, clave: config.clave };
  }, [opciones.mapa, hito, sim.p, sim.d, config]);

  // Sondas fijas en la escena
  const sondas = useMemo(() => {
    if (!opciones.flechas && !opciones.brujulas) return null;
    return { puntos: hito === 1 ? puntosSondaHito1() : puntosSondaHito2(sim.p, perno, sim.d.r_ext), normal: [0, 0, 1] };
  }, [opciones.flechas, opciones.brujulas, hito, sim.p, sim.d, perno]);

  // Hito 2: campo de referencia en las sondas (la dirección no cambia; la magnitud se escala)
  const sondasHito2 = useMemo(() => {
    if (!sondas || hito !== 2) return null;
    const campo = crearCampo(laminasHito2(sim.d, config.referencia.I, config.referencia.M));
    return sondas.puntos.map((p) => {
      const m = marcoMundo2.aMotor(p);
      const c = campo(m.rho, m.z);
      return marcoMundo2.vectorEscena(c.Brho, c.Bz, m.radial);
    });
  }, [sondas, hito, sim.d, config.referencia, marcoMundo2]);
  const campoIman = useMemo(() => (hito === 1 ? crearCampo(laminasHito1(sim.p)) : null), [hito, sim.p]);

  // Intensidad del instante; en cámara lenta del PWM, la del punto del periodo (I, M y B instantáneos)
  const instante = () => {
    const s = usarGemelo.getState();
    if (s.hito !== hito) return { s, f: 0 };
    if (hito === 2 && s.camaraLentaPWM) {
      const pwm = instantePWM(s.sim, s.t, s.fasePWM);
      return { s, f: config.referencia.B_s > 0 ? Math.abs(pwm.B) / config.referencia.B_s : 0, pwm };
    }
    return { s, f: factorIntensidad(hito, s.sim, s.indice, config.referencia) };
  };
  const alturaIman = (s) => alturaImanEnTubo(s.sim.r.x[s.indice], s.sim.p.L_im);

  // El grupo de líneas y mapa se ubica en el centro de la fuente
  useFrame(() => {
    if (!grupo.current) return;
    const { s } = instante();
    if (s.hito !== hito) return;
    const origen = hito === 1 ? marcoHito1(alturaIman(s)).origen : marcoMundo2.origen;
    grupo.current.position.set(...origen);
  });

  const muestrear = () => {
    const { s, f } = instante();
    if (!sondas || s.hito !== hito) return null;
    if (hito === 2) return sondasHito2.map((v) => muestra(v.map((c) => c * f), marcoMundo2.eje, escala));
    const marcoIman = marcoHito1(alturaIman(s));
    return sondas.puntos.map((p) => {
      const m = marcoIman.aMotor(p);
      const c = campoIman(m.rho, m.z);
      return muestra(marcoIman.vectorEscena(c.Brho, c.Bz, m.radial), marcoIman.eje, escala);
    });
  };
  // Hito 1: el mapa ya es el campo del imán; Hito 2: corriente [A] y magnetización [kA/m] actuales
  const fuenteMapa = () => {
    const { s, f, pwm } = instante();
    if (hito === 1 || s.hito !== 2) return { I: f, M: 0 };
    if (pwm) return { I: pwm.I, M: pwm.M / 1000 };
    return { I: s.sim.r.I_prom[s.indice], M: s.sim.r.M[s.indice] / 1000 };
  };
  const intensidad = () => instante().f;

  return (
    <group>
      <group ref={grupo}>
        {opciones.lineas && lineas && (
          <LineasCampo lineas={lineas.lineas} marco={marcoLocal} nPlanos={opciones.nPlanos} escala={escala} intensidad={intensidad} />
        )}
        {mapa && <MapaCalor key={mapa.clave} marco={marcoLocal} bases={mapa.bases} limites={mapa.limites} escala={escala} fuente={fuenteMapa} />}
      </group>
      {sondas && (
        <SondasCampo puntos={sondas.puntos} normalPlano={sondas.normal} muestrear={muestrear} flechas={opciones.flechas} brujulas={opciones.brujulas} />
      )}
    </group>
  );
}
