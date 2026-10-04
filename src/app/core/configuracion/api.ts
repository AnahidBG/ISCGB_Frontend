export const URL_BASE_API = 'http://localhost:5231';

export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  /**
   * Define la contraseña con el token del mail de alta. Sin autenticación.
   * Vive en `UsuariosAdmin` pero la consume `AuthService` — ver su contrato.
   */
  establecerPassword: `${URL_BASE_API}/api/UsuariosAdmin/establecer-password`,
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

  /** Listado paginado. Solo lectura: `UsuariosController` no tiene POST ni PUT. */
  usuarios: `${URL_BASE_API}/api/Usuarios`,

  /** Detalle de un usuario. */
  usuarioPorId: (id: number) => `${URL_BASE_API}/api/Usuarios/${id}`,

  // --- Gestión de usuarios (ISCGB_Backend/Controllers/CargaUsuarioController.cs) ---
  // La clase se llama `UsuariosAdminController`, así que la ruta es
  // `api/UsuariosAdmin` aunque el archivo se llame distinto.

  /** Alta. Body: `CargaUsuarioDto`. */
  altaUsuario: `${URL_BASE_API}/api/UsuariosAdmin/alta`,

  /** Modificación del perfil. Body: `CargaUsuarioDto` completo. */
  modificarUsuario: (id: number) => `${URL_BASE_API}/api/UsuariosAdmin/modificar/${id}`,

  /** Baja lógica (estado inactivo). Sin body. */
  bajaUsuario: (id: number) => `${URL_BASE_API}/api/UsuariosAdmin/baja/${id}`,

  /** Reactivación (alta de una cuenta inactiva). Sin body. */
  reactivarUsuario: (id: number) => `${URL_BASE_API}/api/UsuariosAdmin/alta/${id}`,

  // --- Ubicaciones (ISCGB_Backend/Controllers/UbicacionController.cs) ---
  // Sin autenticación. No existe "todas las provincias" ni "provincia → país":
  // hay que pedir los países y después las provincias de cada uno.

  /** Países, ordenados por nombre. */
  paises: `${URL_BASE_API}/api/Ubicaciones/paises`,

  /** Provincias de un país. 404 = ese país no tiene ninguna cargada (lista vacía, no error). */
  provinciasDePais: (idPais: number) => `${URL_BASE_API}/api/Ubicaciones/paises/${idPais}/provincias`,

  // --- Reconocimiento de saberes (ISCGB_Backend/Controllers/ReconocimientoSaberesController.cs) ---
  // `[Authorize(Roles = "Alumno")]`: el alumno sale del token, no del cuerpo.

  /** El alumno envía la solicitud. multipart/form-data. */
  solicitarReconocimiento: `${URL_BASE_API}/api/ReconocimientoSaberes/solicitar`,

  /** Bandeja de Secretaría: las solicitudes sin docente asignado. Solo `Secretario`. */
  reconocimientosPendientes: `${URL_BASE_API}/api/ReconocimientoSaberes/recibirSolicitudReconocimiento`,

  /** Uno de los dos PDF de una solicitud (`application/pdf`). Solo `Secretario`. */
  adjuntoReconocimiento: (idSolicitud: number, adjunto: 'programa' | 'analitico') =>
    `${URL_BASE_API}/api/ReconocimientoSaberes/${idSolicitud}/${adjunto}`,

  // --- Materias (ISCGB_Backend/Controllers/MateriasController.cs) ---
  // La clase se llama `AsignacionesController`, así que la ruta es
  // `api/Asignaciones` aunque el archivo se llame distinto. Sin autenticación.
  // Los tres GET envuelven la lista en `{ data }`.

  /** Todas las materias del instituto, ordenadas por nombre. */
  materiasDisponibles: `${URL_BASE_API}/api/Asignaciones/materias-disponibles`,

  /** Todos los docentes (fila en `Docentes`), ordenados por nombre. */
  docentesDisponibles: `${URL_BASE_API}/api/Asignaciones/docentes-disponibles`,

  /** Todas las comisiones, ordenadas por nombre. */
  comisionesDisponibles: `${URL_BASE_API}/api/Asignaciones/comisiones-disponibles`,

  /** Alta de una materia. Body: `CargarMateriaDto`. */
  cargarMateria: `${URL_BASE_API}/api/Asignaciones/cargar-materia`,

  /** Asigna una materia a un docente en una comisión. Body: `AsignarMateriaDto`. */
  asignarMateria: `${URL_BASE_API}/api/Asignaciones/asignar`,

  // --- Buscador (ISCGB_Backend/Controllers/BusquedaController.cs, clase `BuscadorController`) ---

  /** Personas, materias y justificativos que contienen el término. Menos de 2 letras = vacío. */
  busquedaGlobal: (termino: string) =>
    `${URL_BASE_API}/api/Buscador/global?termino=${encodeURIComponent(termino)}`,

  // --- Certificados (ISCGB_Backend/Controllers/CertificadosController.cs) ---
  // `[Authorize]`: el alumno sale del propio token (claim NameIdentifier), no
  // de la URL — por eso no llevan id. Devuelven `application/pdf`.

  certificadoAlumnoRegular: `${URL_BASE_API}/api/Certificados/alumno-regular`,
  certificadoAlumnoRegularConHorario: `${URL_BASE_API}/api/Certificados/alumno-regular-horario`,

  // --- Justificativos (ISCGB_Backend/Controllers/JustificativosController.cs) ---

  /** Justificativos en estado Pendiente. Devuelve `[]` (no 404) si no hay ninguno. */
  justificativosPendientes: `${URL_BASE_API}/api/Justificativos/pendientes`,

  /** Cargar un justificativo. multipart/form-data. */
  cargarJustificativo: `${URL_BASE_API}/api/Justificativos/cargar`,

  /** Aprobar/rechazar un justificativo. */
  auditarJustificativo: (idJustificativo: number) =>
    `${URL_BASE_API}/api/Justificativos/auditar/${idJustificativo}`,

  /** Los justificativos de una persona, del más nuevo al más viejo. 404 = la persona no existe. */
  justificativosDeUsuario: (idUsuario: number) =>
    `${URL_BASE_API}/api/Justificativos/${idUsuario}/justificativos`,
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
