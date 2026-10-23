/* Iconos lineales de la interfaz (SVG en linea, 16 px, color del texto). */
const TRAZOS = {
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
  pausa: <><rect x="4" y="3.5" width="2.8" height="9" rx="0.6" fill="currentColor" stroke="none" /><rect x="9.2" y="3.5" width="2.8" height="9" rx="0.6" fill="currentColor" stroke="none" /></>,
  reiniciar: <><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3" /><path d="M3.5 2.8v2.6h2.6" /></>,
  bucle: <><path d="M3 7V6a2 2 0 0 1 2-2h7.5" /><path d="M10.5 2l2 2-2 2" /><path d="M13 9v1a2 2 0 0 1-2 2H3.5" /><path d="M5.5 14l-2-2 2-2" /></>,
  restablecer: <><path d="M4 6.5a4.5 4.5 0 1 1-.3 3.6" /><path d="M3.6 3.2v3.4H7" /></>,
  izquierda: <path d="M10 3.5L5.5 8l4.5 4.5" />,
  derecha: <path d="M6 3.5L10.5 8 6 12.5" />,
  abajo: <path d="M3.5 6l4.5 4.5L12.5 6" />,
  pantalla: <><rect x="2" y="3" width="12" height="8" rx="1.2" /><path d="M8 11v2.5M5.5 13.5h5" /></>,
  alerta: <><path d="M8 2.2l6.2 11H1.8z" /><path d="M8 6.5v3.2" /><circle cx="8" cy="11.4" r="0.5" fill="currentColor" /></>,
  pwm: <path d="M1.5 11.5h2.5v-7h3.5v7h3.5v-7h3.5" />,
};

export default function Icono({ nombre, className = "" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"shrink-0 " + className}
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
