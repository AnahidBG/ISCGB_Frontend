export const URL_BASE_API = 'http://localhost:5231';

export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  programasMateria: `${URL_BASE_API}/api/ProgramasMateria`,

  pdfPrograma: (idPrograma: number) =>
    `${URL_BASE_API}/api/ProgramasMateria/${idPrograma}/pdf`,

  // Quién es el docente (su IdDocente) y qué materias dicta. Lo pide el
  // formulario de entrega del programa al abrirse, para no tener que pedir
  // el "ID Docente" y el "ID Materia" a mano. Ver `ContextoDocente`.
  contextoDocente: (idUsuario: number) =>
    `${URL_BASE_API}/api/ProgramasMateria/contexto-docente/${idUsuario}`,

  // --- Legajos (ISCGB_Backend/Controllers/LegajoController.cs) ---
  // Confirmado leyendo el código fuente real del backend el 27/08/2026.

  /** Documentos de UN usuario. 404 = no tiene ninguno cargado. */
  legajosPorUsuario: (idUsuario: number) => `${URL_BASE_API}/api/Legajos/usuario/${idUsuario}`,

  /** Subir un documento. multipart/form-data. */
  subirLegajo: `${URL_BASE_API}/api/Legajos`,

  /** Aprobar/rechazar un documento del legajo. */
  auditarLegajo: (idLegajo: number, idUsuarioAuditor: number) =>
    `${URL_BASE_API}/api/Legajos/auditar/${idLegajo}?idUsuarioAuditor=${idUsuarioAuditor}`,

  /** Qué documentos son obligatorios para un rol. 404 = ese rol no tiene configurados. */
  documentosRequeridosPorRol: (idRol: number) =>
    `${URL_BASE_API}/api/Legajos/requeridos-por-rol/${idRol}`,

  /**
   * Todos los legajos agrupados por usuario. Incluye a los que no subieron
   * nada (`documentos: []`).
   */
  legajosResumenEstado: `${URL_BASE_API}/api/Legajos/resumen-estado`,

  /**
   * Todos los usuarios con conteos por estado (aprobados/pendientes/
   * rechazados/otros), SIN la lista de documentos — la versión liviana que
   * usa "Ver Legajos" para listar personas sin traer el legajo completo del
   * instituto de entrada. Agregado 01/09/2026 (ver `LegajoController.cs`).
   */
  legajosResumenUsuarios: `${URL_BASE_API}/api/Legajos/resumen-usuarios`,

  /**
   * Documentos pendientes de todo el instituto, con nombre de la persona y
   * del tipo de documento. Devuelve `[]` y no 404 cuando no hay ninguno.
   */
  legajosPendientes: `${URL_BASE_API}/api/Legajos/pendientes`,

  // --- Usuarios (ISCGB_Backend/Controllers/UsuarioController.cs) ---

  /**
   * Listado paginado (GET) y alta de un usuario (POST).
   *
   * ⚠️ El POST TODAVÍA NO EXISTE: `UsuariosController` solo tiene los dos GET.
   * La URL está acá porque es donde corresponde que viva el alta, y porque
   * así el día que el backend la implemente no hay que tocar nada del
   * frontend. Ver docs/contrato-alta-usuario.md.
   */
  usuarios: `${URL_BASE_API}/api/Usuarios`,

  /** Detalle de un usuario. */
  usuarioPorId: (id: number) => `${URL_BASE_API}/api/Usuarios/${id}`,

  // --- Justificativos (ISCGB_Backend/Controllers/JustificativosController.cs) ---

  /** Justificativos en estado Pendiente. Devuelve `[]` (no 404) si no hay ninguno. */
  justificativosPendientes: `${URL_BASE_API}/api/Justificativos/pendientes`,

  /** Cargar un justificativo. multipart/form-data. */
  cargarJustificativo: `${URL_BASE_API}/api/Justificativos/cargar`,

  /** Aprobar/rechazar un justificativo. */
  auditarJustificativo: (idJustificativo: number) =>
    `${URL_BASE_API}/api/Justificativos/auditar/${idJustificativo}`,
} as const;

/**
 * Arma la URL para abrir un archivo subido, a partir de la ruta que guarda
 * el backend.
 *
 * Las rutas guardadas no tienen un formato único: las nuevas vienen con
 * barra inicial (`/uploads/legajos/x.pdf`) pero las cargadas antes quedaron
 * sin ella, y concatenar a lo bruto daría `...5231uploads/...`. Esto
 * normaliza los dos casos.
 */
export function urlArchivoSubido(rutaArchivo: string | null): string | null {
  if (rutaArchivo === null || rutaArchivo.trim() === '') {
    return null;
  }

  const ruta = rutaArchivo.startsWith('/') ? rutaArchivo : `/${rutaArchivo}`;
  return `${URL_BASE_API}${ruta}`;
}
