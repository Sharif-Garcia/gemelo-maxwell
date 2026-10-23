/* Traza las líneas de campo fuera del hilo principal. Recibe { id, laminas, opciones } y
   devuelve { id, lineas, Bmax } transfiriendo los arreglos (sin copiarlos). */
import { trazarLineas } from "../fisica/lineasCampo.js";

self.onmessage = ({ data: { id, laminas, opciones } }) => {
  const { lineas, Bmax } = trazarLineas(laminas, opciones);
  const transferibles = lineas.flatMap((l) => [l.rho.buffer, l.z.buffer, l.B.buffer]);
  self.postMessage({ id, lineas, Bmax }, transferibles);
};
