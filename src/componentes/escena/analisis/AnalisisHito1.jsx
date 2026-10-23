/* Modo análisis del Hito 1 (Faraday-Lenz), todo con los números del instante:
   - el cobre de la bobina brilla con |ε| (tenirCobre);
   - flecha circular: sentido de la corriente que impulsa la FEM inducida;
   - flecha azul en el eje: campo inducido. Por Lenz se opone al flujo que entra (imán acercándose)
     y refuerza el que se va (alejándose); el sentido no depende de pol, que solo es el cableado;
   - flecha oscura en el imán: su momento m (magnetizado en el sentido de la caída);
   - cotas de L_bob y de x (centro de la bobina al centro del imán) y etiquetas con Φ y ε. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { instanteHito1 } from "../../../analisis/analisis.js";
import { CENTRO_BOBINA_1 } from "../../../geometria/mesa.js";
import { EJE_TUBO, alturaImanEnTubo } from "../../../geometria/montajeHito1.js";
import { aEscena } from "../../../geometria/unidades.js";
import { tenirCobre } from "../comunes/materiales.js";
import { COLORES_ANALISIS } from "./primitivas.js";
import { pedirEtiqueta } from "./solicitudes.js";
import Etiqueta3D from "./Etiqueta3D.jsx";
import Cota from "./Cota.jsx";
import Flecha from "./Flecha.jsx";
import FlechaCircular from "./FlechaCircular.jsx";

const Y_BOBINA = CENTRO_BOBINA_1[1];
const ABAJO = [0, -1, 0];              // momento del imán: sentido de la caída
const SEPARACION_COTA = 1.4;           // de la cara de la bobina a la cota [cm]
const LARGO_CAMPO = 3;                 // flecha del campo inducido con |ε| máximo [cm]

export default function AnalisisHito1({ solicitudes }) {
  const sim = usarGemelo((s) => s.sim);
  const circular = useRef(null);
  const campo = useRef(null);
  const momento = useRef(null);
  const cotaL = useRef(null);
  const cotaX = useRef(null);
  const e = useRef({});
  const etiqueta = (nombre) => (el) => { e.current[nombre] = el; };

  const L = aEscena(sim.d.L_bob);
  const rExt = aEscena(sim.d.r_ext);
  const { x: xEje, z: zEje } = EJE_TUBO;
  const centro = [xEje, Y_BOBINA, zEje];

  useFrame(() => {
    const s = usarGemelo.getState();
    if (s.hito !== 1) return;
    const a = instanteHito1(s.sim, s.indice);
    const yIman = alturaImanEnTubo(a.x, s.sim.p.L_im);
    const L_im = aEscena(s.sim.p.L_im);

    tenirCobre(COLORES_ANALISIS.corriente, a.intensidad);
    circular.current?.fijar(centro, ABAJO, a.sentidoInducido, a.intensidad);
    const largo = 0.8 + LARGO_CAMPO * a.intensidad;
    const direccion = [0, -a.sentidoInducido, 0];
    campo.current?.fijar([xEje, Y_BOBINA - (direccion[1] * largo) / 2, zEje], direccion, largo, a.sentidoInducido !== 0 && a.intensidad > 0.03);
    momento.current?.fijar([xEje, yIman + L_im / 2 + 0.5, zEje], ABAJO, L_im + 1, true);

    const xIzq = xEje - rExt - SEPARACION_COTA;
    const xDer = xEje + rExt + SEPARACION_COTA;
    cotaL.current?.fijar([xIzq, Y_BOBINA - L / 2, zEje], [xIzq, Y_BOBINA + L / 2, zEje]);
    cotaX.current?.fijar([xDer, Y_BOBINA, zEje], [xDer, yIman, zEje], Math.abs(yIman - Y_BOBINA) > 0.3);

    const p = (nombre, punto, texto, opciones) => pedirEtiqueta(solicitudes, e.current[nombre], punto, texto, opciones);
    p("phi", [xDer + 0.5, Y_BOBINA + L / 2 + 1.6, zEje], `Φ = ${(a.Phi * 1e3).toFixed(4)} mWb`, { prioridad: 4 });
    p("emf", [xDer + 0.5, Y_BOBINA + L / 2 + 0.6, zEje], `ε = -N dΦ/dt = ${a.emf.toFixed(3)} V`, { prioridad: 3 });
    p("L", [xIzq - 0.3, Y_BOBINA, zEje], `L_bob = ${(sim.d.L_bob * 1e3).toFixed(1)} mm`, { ancla: "right", prioridad: 12 });
    p("x", [xDer + 0.4, (Y_BOBINA + yIman) / 2, zEje], `x = ${(a.x * 1e3).toFixed(1)} mm · v = ${a.v.toFixed(2)} m/s`, { prioridad: 8 });
    p("m", [xEje - aEscena(s.sim.p.d_im) / 2 - 0.4, yIman, zEje], "m (imán)", { ancla: "right", prioridad: 15 });
    const lenz = a.sentidoInducido < 0 ? "Lenz: B inducido se opone al flujo que entra"
      : a.sentidoInducido > 0 ? "Lenz: B inducido sostiene el flujo que se va" : "";
    if (lenz && a.intensidad > 0.03) p("lenz", [xDer + 0.5, Y_BOBINA - L / 2 - 1.2, zEje], lenz, { prioridad: 5 });
    else e.current.lenz?.fijar(0, 0, 0, undefined, false);
  });

  return (
    <group>
      <FlechaCircular ref={circular} color={COLORES_ANALISIS.corriente} radio={rExt + 0.5} />
      <Flecha ref={campo} color={COLORES_ANALISIS.campo} />
      <Flecha ref={momento} color={COLORES_ANALISIS.momento} radio={0.05} />
      <Cota ref={cotaL} />
      <Cota ref={cotaX} />
      {["phi", "emf", "L", "x", "m", "lenz"].map((n) => (
        <Etiqueta3D key={n} ref={etiqueta(n)} tamanoPx={12} anclaX={["L", "m"].includes(n) ? "right" : "left"}
          color={n === "lenz" ? COLORES_ANALISIS.campo : "#1f1f1d"} />
      ))}
    </group>
  );
}
