/* Arduino Uno R3 a escala real, en su marco local (geometria/arduino.js): PCB con serigrafía,
   headers hembra, USB-B, jack, ATmega328P DIP-28, cristal, regulador, condensadores, botón de
   reset, ICSP y LEDs. La colocación la hace el grupo padre. */
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { RoundedBox } from "@react-three/drei";
import { MATERIALES, materialColor } from "./materiales.js";
import { crearTexturaCanvas, texto } from "./texturas.js";
import CajasInstanciadas from "./CajasInstanciadas.jsx";
import { crearAleatorio } from "../../../fisica/adc.js";
import {
  MIL, PLACA, HEADERS, PIEZAS, CONDENSADORES, AGUJEROS_MONTAJE, LEDS, geometriaHeaders, entradaPin,
} from "../../../geometria/arduino.js";

const Y_SUPERIOR = PLACA.elevacion + PLACA.espesor;
const COLOR_PCB = "#0b6d87";
const BLANCO = "rgba(240, 247, 248, 0.95)";

// Rótulo de cada pin en la serigrafía
const ROTULOS = {
  SCL: "SCL", SDA: "SDA", AREF: "AREF", GND3: "GND", D13: "13", D12: "12", D11: "~11", D10: "~10", D9: "~9", D8: "8",
  D7: "7", D6: "~6", D5: "~5", D4: "4", D3: "~3", D2: "2", D1: "TX→1", D0: "RX←0",
  IOREF: "IOREF", RESET: "RESET", "3V3": "3.3V", "5V": "5V", GND1: "GND", GND2: "GND", VIN: "Vin",
  A0: "A0", A1: "A1", A2: "A2", A3: "A3", A4: "A4", A5: "A5",
};

function dibujarSerigrafia(ctx, ancho, alto) {
  const s = ancho / 2700;
  const P = (u, v) => [u * s, (2100 - v) * s];
  ctx.fillStyle = COLOR_PCB;
  ctx.fillRect(0, 0, ancho, alto);

  // Pistas de cobre bajo la máscara (deterministas)
  const azar = crearAleatorio(7);
  ctx.strokeStyle = "rgba(0, 45, 60, 0.32)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    let [u, v] = [300 + azar() * 2200, 250 + azar() * 1600];
    ctx.beginPath();
    ctx.moveTo(...P(u, v));
    for (let k = 0; k < 3; k++) {
      const largo = 80 + azar() * 320;
      const dir = Math.floor(azar() * 4);
      u += [largo, 0, largo * 0.7, -largo * 0.7][dir];
      v += [0, largo, largo * 0.7, largo * 0.7][dir];
      ctx.lineTo(...P(u, v));
    }
    ctx.stroke();
  }

  // Agujeros de montaje con su anillo estañado
  for (const [u, v] of AGUJEROS_MONTAJE) {
    ctx.fillStyle = "#c9ccd0";
    ctx.beginPath();
    ctx.arc(...P(u, v), 95 * s, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#151515";
    ctx.beginPath();
    ctx.arc(...P(u, v), 62 * s, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Contornos de los headers y rótulos de los pines
  ctx.strokeStyle = BLANCO;
  ctx.lineWidth = 4;
  for (const h of HEADERS) {
    const [x0, y0] = P(h.u0 - 58, h.v + 58);
    ctx.strokeRect(x0, y0, (100 * (h.pines.length - 1) + 116) * s, 116 * s);
    h.pines.forEach((pin, i) => {
      if (!ROTULOS[pin]) return;
      const u = h.u0 + 100 * i;
      const arriba = h.v > 1000;
      const [x, y] = P(u, arriba ? 1885 : 215);
      texto(ctx, ROTULOS[pin], x, y, { tamano: 40 * s, color: BLANCO, giro: -Math.PI / 2, alinear: arriba ? "right" : "left" });
    });
  }

  texto(ctx, "DIGITAL (PWM~)", ...P(2150, 1640), { tamano: 62 * s, color: BLANCO });
  texto(ctx, "POWER", ...P(1350, 470), { tamano: 56 * s, color: BLANCO });
  texto(ctx, "ANALOG IN", ...P(2250, 470), { tamano: 56 * s, color: BLANCO });
  texto(ctx, "UNO", ...P(1900, 1230), { tamano: 190 * s, peso: 600, color: BLANCO });

  // Logotipo: símbolo de infinito y nombre
  ctx.lineWidth = 12 * s;
  for (const du of [-62, 62]) {
    ctx.beginPath();
    ctx.arc(...P(1640 + du, 1470), 58 * s, 0, 2 * Math.PI);
    ctx.stroke();
  }
  texto(ctx, "−", ...P(1578, 1470), { tamano: 70 * s, color: BLANCO });
  texto(ctx, "+", ...P(1702, 1470), { tamano: 70 * s, color: BLANCO });
  texto(ctx, "ARDUINO", ...P(1770, 1470), { tamano: 82 * s, color: BLANCO, alinear: "left" });

  texto(ctx, "ICSP", ...P(2420, 1050), { tamano: 44 * s, color: BLANCO, giro: -Math.PI / 2 });
  texto(ctx, "RESET", ...P(330, 1790), { tamano: 44 * s, color: BLANCO });
  for (const led of LEDS) texto(ctx, led.nombre, ...P(led.centro[0] + 100, led.centro[1]), { tamano: 40 * s, color: BLANCO, alinear: "left" });
}

// Caja de una pieza de la placa (centro y tamaño en mil, alto en cm), apoyada sobre el PCB
function Pieza({ pieza, material, children }) {
  const [u, v] = pieza.centro;
  const [du, dv] = pieza.tamano;
  return (
    <group position={[u * MIL, Y_SUPERIOR + pieza.alto / 2, -v * MIL]}>
      <mesh material={material} castShadow receiveShadow>
        <boxGeometry args={[du * MIL, pieza.alto, dv * MIL]} />
      </mesh>
      {children}
    </group>
  );
}

// Patas del DIP-28: 14 por lado, a 100 mil, que bajan desde el cuerpo hasta el PCB
function patasAtmega() {
  const { centro, tamano } = PIEZAS.atmega;
  const posiciones = [];
  for (let k = 0; k < 14; k++) {
    const u = centro[0] - 650 + 100 * k;
    for (const lado of [-1, 1]) posiciones.push([u * MIL, Y_SUPERIOR + 0.09, -(centro[1] + lado * (tamano[1] / 2 + 12)) * MIL]);
  }
  return posiciones;
}

export default function ArduinoUno() {
  const materialSerigrafia = useMemo(
    () => new MeshStandardMaterial({ map: crearTexturaCanvas(2048, Math.round((2048 * 2100) / 2700), dibujarSerigrafia), roughness: 0.48 }),
    [],
  );
  const headers = useMemo(() => geometriaHeaders(), []);
  const agujerosHeaders = useMemo(
    () => HEADERS.flatMap((h) => h.pines.map((pin) => {
      const [x, y, z] = entradaPin(pin);
      return [x, y + 0.001, z];
    })),
    [],
  );
  const patas = useMemo(() => patasAtmega(), []);
  const pinesIcsp = useMemo(() => {
    const [u, v] = PIEZAS.icsp.centro;
    const lista = [];
    for (const du of [-50, 50]) for (const dv of [-100, 0, 100]) lista.push([(u + du) * MIL, Y_SUPERIOR + 0.5, -(v + dv) * MIL]);
    return lista;
  }, []);

  return (
    <group>
      {/* PCB: canto y cara superior con la serigrafía */}
      <mesh position={[PLACA.ancho / 2, PLACA.elevacion + PLACA.espesor / 2, -PLACA.fondo / 2]} material={MATERIALES.pcbCanto} castShadow receiveShadow>
        <boxGeometry args={[PLACA.ancho, PLACA.espesor, PLACA.fondo]} />
      </mesh>
      <mesh position={[PLACA.ancho / 2, Y_SUPERIOR + 0.0008, -PLACA.fondo / 2]} rotation-x={-Math.PI / 2} material={materialSerigrafia} receiveShadow>
        <planeGeometry args={[PLACA.ancho, PLACA.fondo]} />
      </mesh>

      {/* Headers hembra con sus agujeros */}
      {headers.map((h) => (
        <mesh key={h.id} position={h.centro} material={MATERIALES.plasticoNegro} castShadow receiveShadow>
          <boxGeometry args={[h.largo, 0.85, 0.254]} />
        </mesh>
      ))}
      <CajasInstanciadas posiciones={agujerosHeaders} tamano={[0.1, 0.004, 0.1]} material={MATERIALES.agujero} />

      {/* Conectores de alimentación */}
      <Pieza pieza={PIEZAS.usb} material={MATERIALES.niquel}>
        <mesh position={[-(PIEZAS.usb.tamano[0] * MIL) / 2 - 0.002, 0.05, 0]} material={MATERIALES.plasticoNegroMate}>
          <boxGeometry args={[0.01, 0.75, 0.8]} />
        </mesh>
      </Pieza>
      <Pieza pieza={PIEZAS.jack} material={MATERIALES.plasticoNegro}>
        <mesh position={[-(PIEZAS.jack.tamano[0] * MIL) / 2 - 0.002, 0.08, 0]} rotation-z={Math.PI / 2} material={MATERIALES.plasticoNegroMate}>
          <cylinderGeometry args={[0.32, 0.32, 0.02, 24]} />
        </mesh>
      </Pieza>

      {/* Microcontroladores, cristal y regulador */}
      <Pieza pieza={PIEZAS.atmega} material={MATERIALES.plasticoNegroMate}>
        <mesh position={[-1.6, PIEZAS.atmega.alto / 2 + 0.001, 0]} rotation-x={-Math.PI / 2} material={MATERIALES.plasticoNegro}>
          <circleGeometry args={[0.1, 20]} />
        </mesh>
      </Pieza>
      <CajasInstanciadas posiciones={patas} tamano={[0.05, 0.18, 0.08]} material={MATERIALES.estano} />
      <Pieza pieza={PIEZAS.u16} material={MATERIALES.plasticoNegroMate} />
      <group position={[PIEZAS.cristal.centro[0] * MIL, Y_SUPERIOR + PIEZAS.cristal.alto / 2, -PIEZAS.cristal.centro[1] * MIL]}>
        <RoundedBox args={[PIEZAS.cristal.tamano[0] * MIL, PIEZAS.cristal.alto, PIEZAS.cristal.tamano[1] * MIL]} radius={0.09} smoothness={3} material={MATERIALES.niquel} castShadow />
      </group>
      <Pieza pieza={PIEZAS.regulador} material={MATERIALES.plasticoNegroMate}>
        <mesh position={[0, -PIEZAS.regulador.alto / 2 + 0.02, -0.38]} material={MATERIALES.estano}>
          <boxGeometry args={[0.6, 0.04, 0.3]} />
        </mesh>
      </Pieza>

      {/* Condensadores electrolíticos */}
      {CONDENSADORES.map(([u, v]) => (
        <group key={u} position={[u * MIL, Y_SUPERIOR, -v * MIL]}>
          <mesh position={[0, 0.05, 0]} material={MATERIALES.plasticoNegroMate} castShadow>
            <boxGeometry args={[0.66, 0.1, 0.66]} />
          </mesh>
          <mesh position={[0, 0.36, 0]} material={MATERIALES.aluminio} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.52, 28]} />
          </mesh>
        </group>
      ))}

      {/* Botón de reset */}
      <Pieza pieza={{ ...PIEZAS.reset, alto: 0.18 }} material={MATERIALES.niquel}>
        <mesh position={[0, 0.15, 0]} material={MATERIALES.plasticoNegro} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />
        </mesh>
      </Pieza>

      {/* ICSP: base y 6 pines macho */}
      <Pieza pieza={{ ...PIEZAS.icsp, alto: 0.25 }} material={MATERIALES.plasticoNegro} />
      <CajasInstanciadas posiciones={pinesIcsp} tamano={[0.064, 0.6, 0.064]} material={MATERIALES.oro} />

      {/* LEDs (el de encendido brilla) */}
      {LEDS.map((led) => (
        <mesh
          key={led.nombre}
          position={[led.centro[0] * MIL, Y_SUPERIOR + 0.03, -led.centro[1] * MIL]}
          material={led.nombre === "ON" ? materialColor(led.color, { emisivo: 2.5 }) : MATERIALES.ledApagado}
        >
          <boxGeometry args={[0.16, 0.06, 0.08]} />
        </mesh>
      ))}
    </group>
  );
}
