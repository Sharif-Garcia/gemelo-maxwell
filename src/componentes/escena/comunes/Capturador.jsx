/* Captura PNG de la escena en 1920 × 1080 (16:9) con la misma cámara, sin importar el tamaño de
   la ventana ni los paneles (adaptado del polipasto). Cambia el tamaño del búfer de dibujo,
   dibuja un cuadro completo con el postprocesado (advance: corren los useFrame, así las etiquetas
   del modo análisis se miden y acomodan para la imagen, con texto más grande), lee la imagen y
   restaura todo en el mismo paso, así que no se ve en pantalla. */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { descargarURL } from "../../../utilidades/descargas.js";
import { aplicarCuadroCamara } from "./cuadroCamara.js";
import { fijarPantallaCaptura } from "./pantalla.js";

const TAMANO_CAPTURA = { ancho: 1920, alto: 1080 };
const ESCALA_TEXTO = 1.5;   // etiquetas más grandes para el informe y las diapositivas

export default function Capturador({ compositor }) {
  const solicitud = usarGemelo((s) => s.solicitudCaptura);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const c = compositor.current;
    if (solicitud === 0 || !c) return;
    const { gl, camera, size, advance } = get();
    const relacionPixeles = gl.getPixelRatio();
    const { ancho, alto } = TAMANO_CAPTURA;

    gl.setPixelRatio(1);
    c.setSize(ancho, alto, false);
    camera.clearViewOffset();
    camera.aspect = ancho / alto;
    camera.updateProjectionMatrix();
    fijarPantallaCaptura({ width: ancho, height: alto, escalaTexto: ESCALA_TEXTO });
    advance(performance.now());   // etiquetas acomodadas y escaladas en un cuadro previo
    advance(performance.now());
    const url = gl.domElement.toDataURL("image/png");
    fijarPantallaCaptura(null);

    gl.setPixelRatio(relacionPixeles);
    c.setSize(size.width, size.height, false);
    const { paneles, presentacion, t, hito } = usarGemelo.getState();
    aplicarCuadroCamara(camera, size.width, size.height, paneles, presentacion);
    advance(performance.now());
    const tiempo = hito === 1 ? `${(t * 1e3).toFixed(1)}ms` : `${t.toFixed(2)}s`;
    descargarURL(url, `maxwell_hito${hito}_t${tiempo}.png`);
  }, [solicitud, get, compositor]);

  return null;
}
