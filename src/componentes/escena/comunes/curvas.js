/* Curvas para patas y cables a partir de puntos de control [x, y, z]. */
import { CurvePath, LineCurve3, QuadraticBezierCurve3, CatmullRomCurve3, Vector3 } from "three";

/*
 * Polilínea con las esquinas redondeadas (patas dobladas de componentes): tramos rectos y una
 * Bézier cuadrática en cada esquina, con radio limitado a la mitad del tramo más corto.
 */
export function curvaConEsquinas(puntos, radio = 0.06) {
  const v = puntos.map((p) => new Vector3(...p));
  const camino = new CurvePath();
  let anterior = v[0];
  for (let i = 1; i < v.length - 1; i++) {
    const p = v[i];
    const haciaA = v[i - 1].clone().sub(p);
    const haciaB = v[i + 1].clone().sub(p);
    const r = Math.min(radio, haciaA.length() / 2, haciaB.length() / 2);
    const inicio = p.clone().add(haciaA.normalize().multiplyScalar(r));
    const fin = p.clone().add(haciaB.normalize().multiplyScalar(r));
    if (anterior.distanceTo(inicio) > 1e-6) camino.add(new LineCurve3(anterior, inicio));
    camino.add(new QuadraticBezierCurve3(inicio, p, fin));
    anterior = fin;
  }
  camino.add(new LineCurve3(anterior, v.at(-1)));
  return camino;
}

// Curva suave por los puntos (cables flexibles)
export function curvaSuave(puntos) {
  return new CatmullRomCurve3(puntos.map((p) => new Vector3(...p)), false, "centripetal");
}
