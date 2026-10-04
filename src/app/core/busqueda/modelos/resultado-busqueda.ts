/** Qué es cada resultado. Decide a dónde se puede ir desde la pantalla de resultados. */
export type TipoResultado = 'persona' | 'materia' | 'justificativo';

/**
 * Un resultado del buscador del encabezado.
 *
 * Sale de `GET /api/Buscador/global` (`ResultadoBusquedaDto`), ya traducido:
 * el backend etiqueta a TODAS las personas como "Docente" (busca en
 * `Usuarios`, no en `Docentes`) y a los justificativos como "Documento".
 */
export interface ResultadoBusqueda {
  tipo: TipoResultado;
  titulo: string;

  /** La línea gris de abajo ("Legajo/DNI: …", "Estado: …"), o `null`. */
  detalle: string | null;

  /** `idUsuario`, `idMateria` o `idJustificativo`, según el `tipo`. */
  idReferencia: number;
}
