/**
 * `GET /api/Legajos/resumen-usuarios`: todas las personas del instituto con
 * conteos por estado, SIN la lista de documentos de cada una. Coincide con
 * `ResumenUsuarioLegajoDto` del backend.
 *
 * Es la versión liviana de `LegajoResumenUsuario` (ver `legajo-resumen.ts`):
 * la usa "Ver Legajos" para listar personas sin traer el legajo completo del
 * instituto de entrada. El detalle documento por documento se pide recién al
 * abrir el perfil de cada persona, con `LegajoService.obtenerLegajoDeUsuario`.
 *
 * Ojo que devuelve TODOS los usuarios, también los que no subieron nada
 * (`total: 0`).
 */
export interface ResumenUsuarioLegajo {
  idUsuario: number;

  /** Puede llegar vacío si el usuario no tiene nombre ni apellido cargados. */
  nombreCompleto: string;

  /** El backend manda la cadena literal `"Sin DNI"` cuando el campo es null. */
  dni: string;

  aprobados: number;
  pendientes: number;
  rechazados: number;

  /** Documentos cuyo estado no es ninguno de los tres del semáforo (incluye `null`). */
  otros: number;

  total: number;
}
