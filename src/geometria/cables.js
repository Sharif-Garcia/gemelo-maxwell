/*
 * Rutas de cables DuPont y patas de componentes axiales [cm]. Funciones puras (sin three.js):
 * devuelven puntos de control; los componentes los convierten en curvas.
 */

export const CONECTOR = { alto: 1.4, lado: 0.25 };   // carcasa del conector macho DuPont
const SUBIDA = 0.7;                                  // tramo vertical al salir del conector

const sumar = (a, b) => a.map((v, i) => v + b[i]);
const distanciaHorizontal = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/*
 * Puntos de control de un cable entre dos ubicaciones. En un extremo con conector el cable sale
 * vertical desde lo alto de la carcasa; en un extremo libre (terminal de una pieza) sale del
 * punto mismo, hacia arriba o en la dirección `salidaDesde` / `salidaHasta` (vector unitario, por
 * ejemplo de una bornera hacia la protoboard). El arco sube más cuanto más largo es el cable,
 * hasta 6 cm.
 */
export function rutaCable(desde, hasta, { conectorDesde = true, conectorHasta = true, salidaDesde = null, salidaHasta = null } = {}) {
  const inicio = conectorDesde ? sumar(desde, [0, CONECTOR.alto, 0]) : desde;
  const fin = conectorHasta ? sumar(hasta, [0, CONECTOR.alto, 0]) : hasta;
  const largo = distanciaHorizontal(inicio, fin);
  const altura = Math.min(6, 0.8 + 0.18 * largo);
  const cima = Math.max(inicio[1], fin[1]) + altura;
  const medio = [(inicio[0] + fin[0]) / 2, cima, (inicio[2] + fin[2]) / 2];
  const tramo = Math.min(SUBIDA, altura / 2);
  const salir = (punto, salida) => sumar(punto, (salida ?? [0, 1, 0]).map((v) => v * tramo));
  return [inicio, salir(inicio, salidaDesde), medio, salir(fin, salidaHasta), fin];
}

// Ubicación de un extremo con conector macho: protoboard y headers del Arduino
export const llevaConector = (ubicacion) => ubicacion.startsWith("pb:") || ubicacion.startsWith("arduino:");

/*
 * Componente axial (resistencia, diodo) entre dos agujeros: las patas entran al agujero, suben
 * verticales hasta el eje del cuerpo y van horizontales hasta él. Devuelve las dos patas (puntos
 * de control con esquinas a redondear), el centro y la dirección del cuerpo.
 */
export function geometriaAxial(a, b, { altura = 0.32, largoCuerpo = 0.63, profundidad = 0.3 } = {}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const separacion = Math.hypot(dx, dz);
  if (separacion < largoCuerpo + 0.1) throw new Error("Los agujeros están demasiado cerca para el cuerpo");
  const dir = [dx / separacion, 0, dz / separacion];
  const yEje = Math.max(a[1], b[1]) + altura;
  const centro = [(a[0] + b[0]) / 2, yEje, (a[2] + b[2]) / 2];
  const extremo = (signo) => sumar(centro, dir.map((v) => (signo * v * largoCuerpo) / 2));
  return {
    centro,
    direccion: dir,
    largoCuerpo,
    patas: [
      [sumar(a, [0, -profundidad, 0]), [a[0], yEje, a[2]], extremo(-1)],
      [sumar(b, [0, -profundidad, 0]), [b[0], yEje, b[2]], extremo(1)],
    ],
  };
}
