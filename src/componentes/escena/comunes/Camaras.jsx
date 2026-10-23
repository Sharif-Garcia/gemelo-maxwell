/* Control de cámara con giro de 360°, límites, transición suave a las vistas de cada hito y
   seguimiento en vivo del imán en la vista "Seguir imán" (adaptado del polipasto). */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import { CameraControls } from "@react-three/drei";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { CENTRO_BOBINA_1 } from "../../../geometria/mesa.js";
import { alturaImanEnTubo } from "../../../geometria/montajeHito1.js";
import { buscarVista, encuadreVista } from "./vistas.js";
import { areaVisible } from "../../ui/medidas.js";
import { aplicarCuadroCamara } from "./cuadroCamara.js";

// Zona donde puede moverse el punto al que mira la cámara [cm]
const LIMITES_OBJETIVO = new Box3(new Vector3(-45, 0.3, -30), new Vector3(45, 45, 30));

// Altura visible del imán [cm] en el índice actual (solo el Hito 1 tiene imán)
const alturaIman = ({ hito, sim, indice }) => (hito === 1 ? alturaImanEnTubo(sim.r.x[indice], sim.p.L_im) : CENTRO_BOBINA_1[1]);

// camera-controls no tiene una API pública para desplazar a la vez el objetivo actual y el
// final: moveTo/setTarget sin transición cortan la animación en curso y con transición se
// retrasan. Se desplazan ambos vectores internos; update() recoloca la cámara como
// objetivo + esfera, así que el giro y el zoom del usuario se conservan.
function desplazarVertical(controles, dy) {
  controles._target.y += dy;
  controles._targetEnd.y += dy;
  controles._needsUpdate = true;
}

// Lleva la cámara a la vista actual para el área visible del lienzo.
// Devuelve la altura del imán en ese momento (punto de partida del seguimiento).
function encuadrar(controles, { camera, size }, animar) {
  const estado = usarGemelo.getState();
  const yIman = alturaIman(estado);
  const fov = (camera.fov * Math.PI) / 180;
  const area = areaVisible(size.width, size.height, estado.paneles, estado.presentacion);
  const { posicion, objetivo } = encuadreVista(estado.hito, estado.vista, fov, area.ancho / area.alto, yIman);
  controles.setLookAt(...posicion, ...objetivo, animar);
  return yIman;
}

export default function Camaras() {
  const controles = useRef(null);
  const hito = usarGemelo((s) => s.hito);
  const solicitudVista = usarGemelo((s) => s.solicitudVista);
  const paneles = usarGemelo((s) => s.paneles);
  const presentacion = usarGemelo((s) => s.presentacion);
  const get = useThree((s) => s.get);
  const ancho = useThree((s) => s.size.width);
  const alto = useThree((s) => s.size.height);
  const primeraVez = useRef(true);
  const alturaSeguida = useRef(0);

  // El cuadro de la cámara es el área libre entre paneles y barras; el lienzo sigue dibujando
  // debajo de ellos (setViewOffset). Al cambiar el tamaño o plegar un panel solo se corrige
  // este desplazamiento: el giro y el zoom del usuario se conservan. La cámara es "manual"
  // (Escena.jsx) para que R3F no sobrescriba el aspecto.
  useLayoutEffect(() => {
    aplicarCuadroCamara(get().camera, ancho, alto, paneles, presentacion);
  }, [ancho, alto, paneles, presentacion, get]);

  // Reencuadre completo al elegir una vista o al cambiar de hito (sin animación la primera vez)
  useEffect(() => {
    if (!controles.current) return;
    alturaSeguida.current = encuadrar(controles.current, get(), !primeraVez.current);
    primeraVez.current = false;
  }, [solicitudVista, hito, get]);

  useEffect(() => {
    controles.current?.setBoundary(LIMITES_OBJETIVO);
  }, []);

  // Seguimiento del imán: antes de que los controles actualicen la cámara (prioridad -2)
  useFrame(() => {
    const estado = usarGemelo.getState();
    if (!buscarVista(estado.hito, estado.vista).sigue || !controles.current) return;
    const altura = alturaIman(estado);
    const dy = altura - alturaSeguida.current;
    alturaSeguida.current = altura;
    if (dy !== 0) desplazarVertical(controles.current, dy);
  }, -2);

  return (
    <CameraControls
      ref={controles}
      makeDefault
      minDistance={3.5}
      maxDistance={210}
      maxPolarAngle={Math.PI / 2 - 0.05}   // no pasar por debajo de la mesa
      smoothTime={0.6}
    />
  );
}
