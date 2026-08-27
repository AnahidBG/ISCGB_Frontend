export const URL_BASE_API = 'http://localhost:5231';

export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  programasMateria: `${URL_BASE_API}/api/ProgramasMateria`,

  pdfPrograma: (idPrograma: number) =>
    `${URL_BASE_API}/api/ProgramasMateria/${idPrograma}/pdf`,

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

  // --- Usuarios (ISCGB_Backend/Controllers/UsuarioController.cs) ---

  /** Listado paginado. Acepta `?rol=&estado=&pagina=&registrosPorPagina=`. */
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
 * Hace falta porque los dos controladores guardan la ruta con formatos
 * distintos: `LegajosController` devuelve `uploads/xxx.pdf` (sin barra
 * inicial) y `JustificativosController` devuelve `/uploads/justificativos/
 * xxx.pdf` (con barra). Concatenar a lo bruto daría `...5231uploads/...` en
 * un caso y funcionaría en el otro.
 *
 * ⚠️ Hoy estas URLs devuelven 404 aunque el archivo exista en disco:
 * `Program.cs` del backend no llama a `app.UseStaticFiles()`, así que la
 * carpeta `wwwroot/uploads` no se sirve por HTTP. Está reportado en
 * docs/verificacion-backend.md → punto 3. La función ya arma bien la URL:
 * cuando agreguen esa línea, los enlaces empiezan a funcionar solos.
 */
export function urlArchivoSubido(rutaArchivo: string | null): string | null {
  if (rutaArchivo === null || rutaArchivo.trim() === '') {
    return null;
  }

  const ruta = rutaArchivo.startsWith('/') ? rutaArchivo : `/${rutaArchivo}`;
  return `${URL_BASE_API}${ruta}`;
}
