/* Devanado por capas de alambre de cobre esmaltado (hélices reales, geometria/helice.js) en el
   marco de la bobina (eje +y, origen en su centro). `bobina` es la geometría del motor en metros;
   `angulo0` es el ángulo donde empieza y termina el alambre. El grupo padre lo coloca y lo gira.
   `Alambres` dibuja los tramos sueltos que van de los extremos del devanado a una bornera. */
import { useMemo } from "react";
import { TubeGeometry } from "three";
import { MATERIALES } from "./materiales.js";
import { curvaSuave, curvaConEsquinas } from "./curvas.js";
import { capasEnEscena, puntosCapa } from "../../../geometria/helice.js";
import { aEscena } from "../../../geometria/unidades.js";

export default function Devanado({ bobina, angulo0 = Math.PI }) {
  const capas = useMemo(() => {
    const radioHilo = aEscena(bobina.d_hilo) / 2;
    return capasEnEscena(bobina).map((capa) => {
      const puntos = puntosCapa({ ...capa, angulo0, muestrasPorVuelta: 20 });
      return new TubeGeometry(curvaSuave(puntos), puntos.length, radioHilo, 6, false);
    });
  }, [bobina, angulo0]);

  return capas.map((geometria, i) => (
    <mesh key={i} geometry={geometria} material={MATERIALES.cobreEsmaltado} castShadow receiveShadow />
  ));
}

// `alambres`: listas de puntos de control en la escena; `d_hilo` en metros
export function Alambres({ alambres, d_hilo }) {
  const geometrias = useMemo(
    () => alambres.map((puntos) => new TubeGeometry(curvaConEsquinas(puntos, 0.3), 64, aEscena(d_hilo) / 2, 6, false)),
    [alambres, d_hilo],
  );
  return geometrias.map((geometria, i) => (
    <mesh key={i} geometry={geometria} material={MATERIALES.cobreEsmaltado} castShadow />
  ));
}
