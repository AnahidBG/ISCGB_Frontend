/**
 * Una novedad de las que se despliegan al tocar la campana.
 *
 * Son cosas que YA pasaron y que esta persona puede resolver (un documento
 * rechazado, un justificativo esperando revisión), no avisos genéricos. Ver
 * `notificacionesPorRechazos` para el caso más repetido.
 *
 * Vive en `core/` y no junto al encabezado porque ahora las arma un servicio
 * de `core/` (`CampanaService`): `core/` no debería depender de `shared/ui/`.
 * `EstructuraPanel` la re-exporta para no romper a quien ya la importaba de ahí.
 */
export interface NotificacionPanel {
  /** Qué pasó, en una línea. */
  titulo: string;

  /** La aclaración de abajo: el motivo, la fecha, de quién es. */
  detalle?: string;

  /** A dónde lleva al tocarla. Sin esto la fila no es un enlace. */
  url?: string;

  /**
   * Los `queryParams` de ese enlace, por ejemplo `{ tipo: '7' }` para abrir
   * "Subir Documento" con el tipo elegido (`consultaConTipo`).
   *
   * Van aparte y no pegados a `url` por dos razones: `routerLink` codificaría
   * el `?`, y `url` es parte de la clave con la que la campana recuerda qué
   * avisos ya se leyeron. Así, sumar una consulta no hace reaparecer nada.
   */
  consulta?: Readonly<Record<string, string>>;

  /** Colorea el puntito de la izquierda. Por defecto, `pendiente`. */
  tono?: 'aprobado' | 'pendiente' | 'rechazado';
}
