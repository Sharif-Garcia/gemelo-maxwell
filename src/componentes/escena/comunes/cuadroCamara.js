/* Cuadro de la camara: el area libre entre paneles y barras (setViewOffset).
   La comparten Camaras (al cambiar el tamaño o los paneles) y Capturador (al
   restaurar despues de la captura en 1920x1080). */
import { areaVisible } from "../../ui/medidas.js";

export function aplicarCuadroCamara(camara, anchoLienzo, altoLienzo, paneles, presentacion = false) {
  const area = areaVisible(anchoLienzo, altoLienzo, paneles, presentacion);
  camara.aspect = area.ancho / area.alto;
  camara.setViewOffset(area.ancho, area.alto, -area.x, -area.y, anchoLienzo, altoLienzo);
  camara.updateProjectionMatrix();
}
