/* Conversiones entre la escena y la pantalla (copiadas del polipasto).
   Durante la captura PNG (Capturador) la "pantalla" es la imagen de 1920 × 1080: las etiquetas
   se miden y se acomodan para ese tamaño, con texto más grande. */
let captura = null;   // { width, height, escalaTexto } mientras se captura

export function fijarPantallaCaptura(dimensiones) {
  captura = dimensiones;
}

// Ancho, alto y escala del texto de la pantalla donde se dibuja ahora
export function pantallaActual(size) {
  return captura ?? { width: size.width, height: size.height, escalaTexto: 1 };
}

// Unidades de escena por píxel a la distancia d de la cámara (cuadro de la cámara con setViewOffset)
export function metrosPorPixel(camara, altoPantalla, d) {
  const altoCuadro = camara.view?.enabled ? camara.view.fullHeight : altoPantalla;
  return (2 * d * Math.tan((camara.fov * Math.PI) / 360)) / altoCuadro;
}
