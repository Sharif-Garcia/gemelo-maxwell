/* Modo análisis (tecla A, adaptado del polipasto): piezas semitransparentes, nodos del circuito
   con su tensión, cotas y las leyes de cada hito dibujadas sobre el montaje.
   Acomodo de etiquetas: en cada cuadro los hijos piden sus etiquetas (punto 3D, texto, anclaje y
   prioridad) y aquí se proyectan a la pantalla, se separan para que no se encimen y se vuelven a
   llevar a 3D. */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { usarGemelo } from "../../../estado/usarGemelo.js";
import { acomodarEtiquetas, anchoTexto } from "../../../analisis/etiquetas.js";
import { aplicarModoMateriales } from "../comunes/materiales.js";
import { pantallaActual } from "../comunes/pantalla.js";
import NodosCircuito from "./NodosCircuito.jsx";
import AnalisisHito1 from "./AnalisisHito1.jsx";
import AnalisisHito2 from "./AnalisisHito2.jsx";

const v = new Vector3();

export default function ModoAnalisis() {
  const analisis = usarGemelo((s) => s.modo === "analisis");
  const hito = usarGemelo((s) => s.hito);
  const camara = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const solicitudes = useRef([]);

  useEffect(() => {
    aplicarModoMateriales(analisis);
    return () => aplicarModoMateriales(false);
  }, [analisis]);

  // Corre después de los useFrame de los hijos (se suscriben antes que el padre)
  useFrame(() => {
    const lista = solicitudes.current;
    if (lista.length === 0) return;
    lista.sort((a, b) => a.prioridad - b.prioridad);
    const { width, height, escalaTexto } = pantallaActual(size);
    const rects = lista.map((s) => {
      v.set(...s.punto).project(camara);
      s.z = v.z;
      const x = ((v.x + 1) / 2) * width;
      const tamano = s.tamano * escalaTexto;
      const ancho = anchoTexto(s.texto, tamano);
      return {
        x: s.ancla === "right" ? x - ancho : x,
        y: ((1 - v.y) / 2) * height,
        ancho,
        alto: tamano + 4,
        xAncla: x,
      };
    });
    const ys = acomodarEtiquetas(rects, 4 * escalaTexto);
    lista.forEach((s, i) => {
      // Detrás de la cámara no se dibuja
      const visible = s.z < 1;
      v.set((rects[i].xAncla / width) * 2 - 1, 1 - (ys[i] / height) * 2, s.z).unproject(camara);
      s.etiqueta?.fijar(v.x, v.y, v.z, s.texto, visible);
    });
    solicitudes.current = [];
  });

  if (!analisis) return null;
  return (
    <group key={hito}>
      <NodosCircuito hito={hito} solicitudes={solicitudes} />
      {hito === 1 ? <AnalisisHito1 solicitudes={solicitudes} /> : <AnalisisHito2 solicitudes={solicitudes} />}
    </group>
  );
}
