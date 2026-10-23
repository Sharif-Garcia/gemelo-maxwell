/* Acomodo de etiquetas en pantalla (función pura): cada etiqueta, en orden de
   prioridad, se desplaza lo mínimo (hacia arriba o hacia abajo) para no tocar a
   las ya colocadas.
   rects: [{ x, y, ancho, alto }] en pixeles (y hacia abajo, y = centro vertical).
   Devuelve las nuevas y. */
export function acomodarEtiquetas(rects, separacion = 2) {
  const colocadas = [];
  const choca = (r, y) => colocadas.some((c) =>
    r.x < c.x + c.ancho && c.x < r.x + r.ancho && Math.abs(y - c.y) < (r.alto + c.alto) / 2 + separacion);
  return rects.map((r) => {
    // Candidatas: la posicion pedida y los bordes de cada etiqueta colocada
    const candidatas = [r.y];
    for (const c of colocadas) {
      const d = (r.alto + c.alto) / 2 + separacion;
      candidatas.push(c.y + d, c.y - d);
    }
    candidatas.sort((a, b) => Math.abs(a - r.y) - Math.abs(b - r.y) || b - a);
    const y = candidatas.find((cy) => !choca(r, cy)) ?? r.y;
    colocadas.push({ ...r, y });
    return y;
  });
}

// Ancho aproximado de un texto de Inter en pixeles
export const anchoTexto = (texto, tamanoPx) => texto.length * 0.56 * tamanoPx + 4;
