/* Líneas de campo calculadas en el worker. Se piden de nuevo solo cuando cambia la clave de la
   configuración (la forma de las líneas); mientras tanto se siguen mostrando las anteriores. */
import { useEffect, useRef, useState } from "react";
import { trazarLineas } from "../fisica/lineasCampo.js";

let trabajador = null;
let siguienteId = 0;
const pendientes = new Map();

function pedirLineas(laminas, opciones) {
  // Sin Worker (por ejemplo en pruebas) se calcula en el hilo principal
  if (typeof Worker === "undefined") return Promise.resolve(trazarLineas(laminas, opciones));
  if (!trabajador) {
    trabajador = new Worker(new URL("../trabajadores/campo.worker.js", import.meta.url), { type: "module" });
    trabajador.onmessage = ({ data }) => {
      pendientes.get(data.id)?.(data);
      pendientes.delete(data.id);
    };
  }
  const id = ++siguienteId;
  return new Promise((resolver) => {
    pendientes.set(id, resolver);
    trabajador.postMessage({ id, laminas, opciones });
  });
}

// configuracion: { laminas, opciones, clave } (fisica/campoHitos.js) o null para no calcular
export function useLineasCampo(configuracion) {
  const [resultado, setResultado] = useState(null);
  // La configuración cambia de objeto en cada simulación; solo su clave decide si se recalcula
  const ultima = useRef(configuracion);
  useEffect(() => {
    ultima.current = configuracion;
  });
  const clave = configuracion?.clave ?? null;

  useEffect(() => {
    if (!clave) return undefined;
    let vigente = true;
    const { laminas, opciones } = ultima.current;
    pedirLineas(laminas, opciones).then((r) => {
      if (vigente) setResultado({ ...r, clave });
    });
    return () => {
      vigente = false;
    };
  }, [clave]);

  return resultado;
}
