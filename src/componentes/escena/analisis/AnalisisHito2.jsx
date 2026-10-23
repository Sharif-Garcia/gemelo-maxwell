/* Modo análisis del Hito 2 (Ampère), con los números del instante (promedios del periodo en el
   barrido; valores del tic en la cámara lenta del PWM):
   - partículas de corriente en el lazo de potencia y el cobre del solenoide que brilla con i;
   - el diodo se ilumina mientras conduce (transistor apagado);
   - flecha circular: sentido de la corriente en el solenoide; flechas de H (sobre el solenoide),
     de M (en el eje del núcleo) y de B en el sensor, escaladas a su máximo del barrido;
   - cotas de L_nuc y d_sensor y etiquetas con N·I, H, M y B_s. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { CIRCUITOS } from "../../../geometria/circuitos.js";
import { posicionUbicacion } from "../../../geometria/montaje.js";
import { geometriaAxial } from "../../../geometria/cables.js";
import { EJE_PERNO, SENSOR, colocacionPerno } from "../../../geometria/montajeHito2.js";
import { aEscena } from "../../../geometria/unidades.js";
import { tenirCobre } from "../comunes/materiales.js";
import { COLORES_ANALISIS } from "./primitivas.js";
import { instanteActual, pedirEtiqueta } from "./solicitudes.js";
import Etiqueta3D from "./Etiqueta3D.jsx";
import Cota from "./Cota.jsx";
import Flecha from "./Flecha.jsx";
import FlechaCircular from "./FlechaCircular.jsx";
import ParticulasCorriente from "./ParticulasCorriente.jsx";

const MAS_X = [1, 0, 0];
const { y: yEje, z: zEje } = EJE_PERNO;
const terminal = (id, nombre) => posicionUbicacion(2, CIRCUITOS[2].componentes.find((c) => c.id === id).terminales[nombre]);
// Centro del cuerpo del diodo (como lo coloca Diodo1N4007)
const CENTRO_DIODO = geometriaAxial(terminal("D1", "anodo"), terminal("D1", "catodo"), { largoCuerpo: 0.52, altura: 0.28 }).centro;
const ETIQUETAS = ["ni", "h", "m", "b", "lnuc", "dsensor", "diodo"];
const A_LA_DERECHA = ["m"];

export default function AnalisisHito2({ solicitudes }) {
  const sim = usarGemelo((s) => s.sim);
  const conDiodo = usarGemelo((s) => s.parametros.con_diodo);
  const circular = useRef(null);
  const flechaH = useRef(null);
  const flechaM = useRef(null);
  const flechaB = useRef(null);
  const cotaL = useRef(null);
  const cotaD = useRef(null);
  const brillo = useRef(null);
  const e = useRef({});
  const etiqueta = (nombre) => (el) => { e.current[nombre] = el; };

  const perno = useMemo(() => colocacionPerno(sim.p), [sim]);
  // Máximos del barrido para escalar las flechas de M y B
  const maximos = useMemo(() => ({
    M: Math.max(1e-9, ...sim.pasos.map((s) => Math.abs(s.M_prom)), ...sim.pasos.map((s) => Math.max(...s.periodo.M))),
    B: Math.max(1e-12, ...sim.pasos.map((s) => Math.max(...s.periodo.B.map(Math.abs)))),
  }), [sim]);
  const rExt = aEscena(sim.d.r_ext);
  const largoMax = 0.8 * perno.largo;

  useFrame(() => {
    const s = usarGemelo.getState();
    if (s.hito !== 2) return;
    const a = instanteActual(s);
    const prom = a.promedio ? " prom" : "";

    tenirCobre(COLORES_ANALISIS.corriente, a.intensidad);
    circular.current?.fijar([perno.xBobina, yEje, zEje], MAS_X, a.i > 1e-6 ? 1 : 0, a.intensidad);

    const yH = yEje + rExt + 0.9;
    const largoH = 0.4 + largoMax * a.intensidad;
    flechaH.current?.fijar([perno.xBobina - largoH / 2, yH, zEje], MAS_X, largoH, a.i > 1e-6);
    const largoM = 0.4 + largoMax * Math.min(1, Math.abs(a.M) / maximos.M);
    flechaM.current?.fijar([perno.xCentro - largoM / 2, yEje, zEje], MAS_X, largoM, Math.abs(a.M) > 1e-6);
    // B en el sensor: sentido físico B·orientacion sobre +x
    const Bfisico = a.B * s.sim.p.orientacion;
    const largoB = 0.3 + 1.5 * Math.min(1, Math.abs(a.B) / maximos.B);
    const yB = yEje + perno.radio + 0.45;
    flechaB.current?.fijar([perno.xPunta, yB, zEje], [Math.sign(Bfisico) || 1, 0, 0], largoB, Math.abs(a.B) > 1e-7);

    if (brillo.current) {
      brillo.current.visible = conDiodo && a.intensidadDiodo > 0.02;
      brillo.current.material.opacity = 0.3 + 0.45 * a.intensidadDiodo;
    }

    const yCotaL = yH + 1;
    const yCotaD = yEje - perno.radio - 0.5;
    cotaL.current?.fijar([perno.xCola, yCotaL, zEje], [perno.xPunta, yCotaL, zEje]);
    cotaD.current?.fijar([perno.xPunta, yCotaD, zEje], [SENSOR.xCara, yCotaD, zEje]);

    const p = (nombre, punto, texto, opciones) => pedirEtiqueta(solicitudes, e.current[nombre], punto, texto, opciones);
    p("ni", [perno.xBobina - aEscena(sim.d.L_bob) / 2, yEje - rExt - 1.3, zEje], `i${prom} = ${a.i.toFixed(3)} A · N·I = ${a.NI.toFixed(1)} A`, { prioridad: 3 });
    p("h", [perno.xBobina + largoH / 2 + 0.3, yH, zEje], `H${prom} = ${(a.H / 1e3).toFixed(2)} kA/m`, { prioridad: 4 });
    p("m", [perno.xCola - 0.4, yEje, zEje], `M${prom} = ${(a.M / 1e3).toFixed(1)} kA/m (M/Ms = ${(a.M_Ms * 100).toFixed(1)} %)`, { ancla: "right", prioridad: 5 });
    p("b", [SENSOR.xCara + 0.5, yB + 0.6, zEje], `B_s${prom} = ${(a.B * 1e3).toFixed(2)} mT → V_hall = ${a.V_hall.toFixed(3)} V`, { prioridad: 6 });
    p("lnuc", [perno.xCentro, yCotaL + 0.5, zEje], `L_nuc = ${(sim.p.L_nuc * 1e3).toFixed(0)} mm`, { prioridad: 12 });
    p("dsensor", [SENSOR.xCara + 0.4, yCotaD - 0.4, zEje], `d_sensor = ${(sim.p.d_sensor * 1e3).toFixed(1)} mm`, { prioridad: 13 });
    if (conDiodo && a.iDiodo > 1e-4) {
      p("diodo", [CENTRO_DIODO[0], CENTRO_DIODO[1] + 1.2, CENTRO_DIODO[2]], `i_diodo${prom} = ${a.iDiodo.toFixed(3)} A`, { prioridad: 7 });
    } else {
      e.current.diodo?.fijar(0, 0, 0, undefined, false);
    }
  });

  return (
    <group>
      <ParticulasCorriente />
      <FlechaCircular ref={circular} color={COLORES_ANALISIS.corriente} radio={rExt + 0.45} />
      <Flecha ref={flechaH} color={COLORES_ANALISIS.campo} />
      <Flecha ref={flechaM} color={COLORES_ANALISIS.magnetizacion} radio={0.07} />
      <Flecha ref={flechaB} color={COLORES_ANALISIS.campo} radio={0.04} punta={{ radio: 0.12, largo: 0.3 }} />
      <Cota ref={cotaL} />
      <Cota ref={cotaD} />
      <mesh ref={brillo} position={CENTRO_DIODO} visible={false} renderOrder={11}>
        {/* Halo con mezcla normal: la aditiva no se ve sobre el fondo claro del estudio */}
        <sphereGeometry args={[0.5, 20, 14]} />
        <meshBasicMaterial color={COLORES_ANALISIS.diodo} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      {ETIQUETAS.map((n) => (
        <Etiqueta3D key={n} ref={etiqueta(n)} tamanoPx={12} anclaX={A_LA_DERECHA.includes(n) ? "right" : "left"} />
      ))}
    </group>
  );
}
