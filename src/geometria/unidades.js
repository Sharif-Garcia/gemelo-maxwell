/* Escala de la escena: 1 unidad = 1 cm. Es el único lugar de la conversión desde SI. */

export const ESCALA = 100;   // metros → unidades de escena (cm)

export const aEscena = (metros) => metros * ESCALA;
