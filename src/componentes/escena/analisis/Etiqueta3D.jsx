/* Etiqueta de texto en la escena (sale en las capturas) que siempre mira a la cámara y mantiene
   un tamaño fijo en píxeles (copiada del polipasto). El componente padre la mueve y cambia su
   texto en useFrame con la API del ref:
     ref.current.fijar(x, y, z, texto?, visible?)
   texto() y tamano() permiten medirla para acomodarla en pantalla. */
import { Suspense, useImperativeHandle, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { Vector3 } from "three";
import fuente from "@fontsource/inter/files/inter-latin-600-normal.woff?url";
import { metrosPorPixel, pantallaActual } from "../comunes/pantalla.js";

const v = new Vector3();

export default function Etiqueta3D({ ref, texto = "", tamanoPx = 13, color = "#1f1f1d", anclaX = "left", anclaY = "middle", posicion = [0, 0, 0] }) {
  const grupo = useRef(null);
  const textoRef = useRef(null);
  const actual = useRef(texto);
  const camara = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useImperativeHandle(ref, () => ({
    fijar(x, y, z, nuevoTexto, visible = true) {
      if (!grupo.current) return;
      grupo.current.position.set(x, y, z);
      grupo.current.visible = visible;
      if (nuevoTexto !== undefined && nuevoTexto !== actual.current && textoRef.current) {
        actual.current = nuevoTexto;
        textoRef.current.text = nuevoTexto;
        textoRef.current.sync();
      }
    },
    texto: () => actual.current,
    tamano: () => tamanoPx,
    grupo: () => grupo.current,
  }), [tamanoPx]);

  // Tamaño constante en pantalla
  useFrame(() => {
    if (!grupo.current) return;
    grupo.current.getWorldPosition(v);
    const pantalla = pantallaActual(size);
    const escala = metrosPorPixel(camara, pantalla.height, v.distanceTo(camara.position)) * tamanoPx * pantalla.escalaTexto;
    grupo.current.scale.setScalar(escala);
  });

  return (
    <group ref={grupo} position={posicion}>
      <Billboard>
        <Suspense fallback={null}>
          <Text
            ref={textoRef}
            font={fuente}
            fontSize={1}
            color={color}
            anchorX={anclaX}
            anchorY={anclaY}
            outlineWidth={0.14}
            outlineColor="#ffffff"
            renderOrder={20}
            material-depthTest={false}
          >
            {texto}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  );
}
