/* Colocación de piezas en la escena: un punto local [x, y, z] se gira rotY alrededor de +y y
   se traslada a `posicion`. Funciones puras (sin three.js). */

export function aplicarColocacion([x, y, z], { posicion, rotY = 0 }) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [posicion[0] + c * x + s * z, posicion[1] + y, posicion[2] - s * x + c * z];
}

// Caja alineada a los ejes que contiene los puntos dados
export function cajaDePuntos(puntos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of puntos) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i]);
      max[i] = Math.max(max[i], p[i]);
    }
  }
  return { min, max };
}
