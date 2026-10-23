/* Texturas dibujadas en un canvas 2D (serigrafía del Arduino, marcas de la protoboard). */
import { CanvasTexture, SRGBColorSpace } from "three";

export const FUENTE = "Inter, ui-sans-serif, system-ui, sans-serif";

/*
 * Crea la textura y la dibuja con `dibujar(ctx, ancho, alto)`. Se vuelve a dibujar cuando la
 * fuente Inter termina de cargar, para que los rótulos no queden con la fuente de respaldo.
 */
export function crearTexturaCanvas(ancho, alto, dibujar) {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 8;
  const pintar = () => {
    ctx.clearRect(0, 0, ancho, alto);
    dibujar(ctx, ancho, alto);
    textura.needsUpdate = true;
  };
  pintar();
  document.fonts?.load(`600 32px ${FUENTE}`).then(pintar, () => {});
  return textura;
}

// Texto centrado en (x, y), opcionalmente girado [rad]
export function texto(ctx, contenido, x, y, { tamano, peso = 600, color, giro = 0, alinear = "center" }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.font = `${peso} ${tamano}px ${FUENTE}`;
  ctx.fillStyle = color;
  ctx.textAlign = alinear;
  ctx.textBaseline = "middle";
  ctx.fillText(contenido, 0, 0);
  ctx.restore();
}
