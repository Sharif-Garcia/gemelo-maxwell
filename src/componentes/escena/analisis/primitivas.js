/* Colores del modo análisis y orientación de piezas a lo largo de una dirección (sin React).
   Los colores salen de la paleta de las gráficas para que la misma magnitud se vea igual en la
   escena y en los paneles. */
import { Matrix4, Quaternion, Vector3 } from "three";
import { COLORES, COLOR_MEDICION } from "../../../graficas/series.js";

export const COLORES_ANALISIS = {
  corriente: COLORES.naranja,   // i, sentido de la corriente (y de la FEM inducida)
  campo: COLORES.azul,          // B inducido, H
  magnetizacion: COLORES.aqua,  // M del núcleo
  momento: COLOR_MEDICION,      // momento del imán
  cota: "#3b3a37",
  diodo: "#ffb020",
};

const Y = new Vector3(0, 1, 0);
const ARRIBA = new Vector3(0, 1, 0);
const LADO = new Vector3(1, 0, 0);
const x = new Vector3();
const z = new Vector3();
const m = new Matrix4();

/*
 * Cuaternión que lleva el eje +y local a `direccion` (unitaria) y deja el +x local horizontal
 * cuando se puede (así las marcas de una cota quedan acostadas y no giran al azar).
 */
export function orientarSegunY(direccion, salida = new Quaternion()) {
  x.crossVectors(direccion, ARRIBA);
  if (x.lengthSq() < 1e-8) x.crossVectors(direccion, LADO);
  x.normalize();
  z.crossVectors(x, direccion).normalize();
  return salida.setFromRotationMatrix(m.makeBasis(x, direccion, z));
}

export const EJE_Y = Y;
