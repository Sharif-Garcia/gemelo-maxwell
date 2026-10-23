/* Reloj de reproduccion: avanza t con requestAnimationFrame.
   No se suscribe al estado, por lo que no provoca renders de React. */
import { useEffect } from "react";
import { usarGemelo } from "../estado/usarGemelo.js";

const DT_MAXIMO = 0.1;   // evita saltos grandes al volver de otra pestaña [s]

export function useReloj() {
  useEffect(() => {
    let idCuadro;
    let anterior = performance.now();

    const cuadro = (ahora) => {
      const dtReal = Math.min((ahora - anterior) / 1000, DT_MAXIMO);
      anterior = ahora;
      usarGemelo.getState().avanzar(dtReal);
      idCuadro = requestAnimationFrame(cuadro);
    };

    idCuadro = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(idCuadro);
  }, []);
}
