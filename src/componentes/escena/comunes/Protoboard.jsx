/* Protoboard de 830 puntos en su marco local (geometria/protoboard.js): cuerpo blanco, marcas
   impresas (rieles rojo y azul, letras, números y canal central) y los 830 agujeros instanciados. */
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { RoundedBox } from "@react-three/drei";
import { MATERIALES } from "./materiales.js";
import { crearTexturaCanvas, texto } from "./texturas.js";
import CajasInstanciadas from "./CajasInstanciadas.jsx";
import { PB, PASO, FILAS, COLUMNAS, agujeroLocal, todosLosAgujeros, xColumna, zFila, zRiel } from "../../../geometria/protoboard.js";

const PIXELES_POR_CM = 200;
const ROJO = "#d33a35";
const AZUL = "#2f5fc4";
const TINTA = "#55575c";

function dibujarMarcas(ctx, ancho, alto) {
  const s = PIXELES_POR_CM;
  const X = (x) => (x + PB.ancho / 2) * s;
  const Z = (z) => (z + PB.fondo / 2) * s;
  ctx.fillStyle = "#f2f0e9";
  ctx.fillRect(0, 0, ancho, alto);

  // Canal central
  const canal = ctx.createLinearGradient(0, Z(-0.17), 0, Z(0.17));
  canal.addColorStop(0, "#c9c6bd");
  canal.addColorStop(0.5, "#b3b0a6");
  canal.addColorStop(1, "#c9c6bd");
  ctx.fillStyle = canal;
  ctx.fillRect(X(-PB.ancho / 2 + 0.3), Z(-0.17), (PB.ancho - 0.6) * s, 0.34 * s);

  // Líneas de los rieles: roja junto al "+", azul junto al "-"
  const linea = (z, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(X(-7.6), Z(z) - 0.02 * s, 15.2 * s, 0.04 * s);
  };
  linea(zRiel("sup-") - 0.17, AZUL);
  linea(zRiel("sup+") + 0.17, ROJO);
  linea(zRiel("inf-") - 0.17, AZUL);
  linea(zRiel("inf+") + 0.17, ROJO);
  for (const riel of ["sup-", "sup+", "inf-", "inf+"]) {
    const signo = riel.endsWith("+") ? "+" : "−";
    const color = signo === "+" ? ROJO : AZUL;
    for (const x of [-7.95, 7.95]) texto(ctx, signo, X(x), Z(zRiel(riel)), { tamano: 0.22 * s, color });
  }

  // Letras de las filas a ambos lados y números de columna cada 5
  for (const fila of FILAS) {
    for (const x of [xColumna(1) - 0.3, xColumna(COLUMNAS) + 0.3]) texto(ctx, fila, X(x), Z(zFila(fila)), { tamano: 0.16 * s, peso: 500, color: TINTA });
  }
  for (let c = 1; c <= COLUMNAS; c++) {
    if (c !== 1 && c % 5 !== 0) continue;
    for (const z of [zFila("j") - 0.3, zFila("a") + 0.3]) texto(ctx, String(c), X(xColumna(c)), Z(z), { tamano: 0.14 * s, peso: 500, color: TINTA });
  }
}

// El plano impreso deja libre el borde redondeado del cuerpo; la textura (dibujada para el
// cuerpo completo) se recorta igual para que las marcas coincidan con los agujeros
const BORDE = 0.06;

export default function Protoboard() {
  const material = useMemo(() => {
    const mapa = crearTexturaCanvas(Math.round(PB.ancho * PIXELES_POR_CM), Math.round(PB.fondo * PIXELES_POR_CM), dibujarMarcas);
    mapa.repeat.set((PB.ancho - 2 * BORDE) / PB.ancho, (PB.fondo - 2 * BORDE) / PB.fondo);
    mapa.offset.set(BORDE / PB.ancho, BORDE / PB.fondo);
    return new MeshStandardMaterial({ map: mapa, roughness: 0.72 });
  }, []);
  const agujeros = useMemo(() => todosLosAgujeros().map((id) => {
    const [x, , z] = agujeroLocal(id);
    return [x, 0.0015, z];
  }), []);

  return (
    <group>
      <RoundedBox args={[PB.ancho, PB.alto, PB.fondo]} radius={0.08} smoothness={3} position={[0, -PB.alto / 2, 0]} material={MATERIALES.plasticoBlanco} castShadow receiveShadow />
      <mesh position={[0, 0.0008, 0]} rotation-x={-Math.PI / 2} material={material} receiveShadow>
        <planeGeometry args={[PB.ancho - 2 * BORDE, PB.fondo - 2 * BORDE]} />
      </mesh>
      <CajasInstanciadas posiciones={agujeros} tamano={[PASO * 0.4, 0.003, PASO * 0.4]} material={MATERIALES.agujero} />
    </group>
  );
}
