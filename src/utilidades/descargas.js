/* Descargas desde el navegador: CSV del gemelo y captura PNG de la escena
   (la captura la hace Capturador.jsx dentro del lienzo). */

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarTexto(texto, nombre) {
  descargar(new Blob([texto], { type: "text/csv;charset=utf-8" }), nombre);
}

// Descarga una imagen ya codificada (data URL)
export function descargarURL(url, nombre) {
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
}
