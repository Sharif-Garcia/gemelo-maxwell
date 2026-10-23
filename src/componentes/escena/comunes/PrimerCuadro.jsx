/* Avisa al estado cuando la escena ya dibujó su primer cuadro (pantalla de carga). Copiado del
   polipasto. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../../estado/usarGemelo.js";

export default function PrimerCuadro() {
  const avisado = useRef(false);
  useFrame(() => {
    if (avisado.current) return;
    avisado.current = true;
    usarGemelo.setState({ escenaLista: true });
  });
  return null;
}
