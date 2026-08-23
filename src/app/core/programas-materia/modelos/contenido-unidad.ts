/**
 * Una unidad del programa de materia (una fila de la tabla `Contenido`).
 *
 * `unidad` es el número de orden (1, 2, 3...), no un ID de base de datos:
 * ese lo asigna el backend cuando persiste el programa completo.
 */
export interface ContenidoUnidad {
  unidad: number;
  tituloUnidad: string;
  contenido: string;
  bibliografiaObligatoria: string;
  bibliografiaComplementaria: string;
}

/** Una unidad vacía, para agregar filas nuevas al formulario. */
export function unidadVacia(numeroDeOrden: number): ContenidoUnidad {
  return {
    unidad: numeroDeOrden,
    tituloUnidad: '',
    contenido: '',
    bibliografiaObligatoria: '',
    bibliografiaComplementaria: '',
  };
}
