export const URL_BASE_API = 'http://localhost:5231';

export const RUTAS_API = {
  login: `${URL_BASE_API}/api/Auth/login`,
  /**
   * Define la contraseña con el token del mail de alta. Sin autenticación.
   * Vive en `UsuariosAdmin` pero la consume `AuthService` — ver su contrato.
   */
  establecerPassword: `${URL_BASE_API}/api/UsuariosAdmin/establecer-password`,

  // --- Recupero de contraseña (ISCGB_Backend/Controllers/AuthController.cs) ---
  // Confirmado leyendo el código del backend del 19/10/2026 (PR #40). Los dos
  // son públicos (`[AllowAnonymous]`) y los consume `AuthService`.

  /**
   * Paso 1: pide el mail con el enlace. Body `{ dni }`. Responde 200 exista o
   * no el DNI, para no revelar quién está registrado. El mail trae
   * `/restablecer-password?token=...` y el token vence en 1 hora.
   */
  recuperarContrasena: `${URL_BASE_API}/api/Auth/recuperar-contrasena`,

  /**
   * Paso 2: guarda la contraseña nueva con el token del mail. Body
   * `{ token, nuevaPassword }`. No es el mismo endpoint que `establecerPassword`
   * (el del alta), aunque los dos buscan el token en la misma columna.
   */
  restablecerPassword: `${URL_BASE_API}/api/Auth/establecer-password`,

  programasMateria: `${URL_BASE_API}/api/ProgramasMateria`,
  /** GET/PUT de la frecuencia del envío automático de avisos de faltantes. */
  frecuenciaNotificaciones: `${URL_BASE_API}/api/Configuracion/frecuencia-notificaciones`,

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

  /**
   * La persona de la sesión actualiza sus propios datos de contacto. `PUT`, con
   * `[Authorize]` y sin rol: el usuario sale del token. Desde el 17/10/2026 un
   * campo que llega vacío (`""`) se BORRA y uno ausente se deja como está; la
   * provincia con id <= 0 también se borra. El correo vacío se ignora.
   */
  miPerfil: `${URL_BASE_API}/api/Usuarios/mi-perfil`,

  /**
   * La persona de la sesión sube su foto de perfil. `POST` multipart con el
   * archivo en `Foto`, con `[Authorize]` y sin rol. Solo `.jpg`, `.jpeg` y
   * `.png` (si no, `400 { message }`). Responde `200 { message, url }`, con la
   * ruta relativa ("/uploads/perfiles/…"). La foto vuelve en el login (`foto`).
   */
  fotoPerfil: `${URL_BASE_API}/api/Usuarios/foto-perfil`,

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
  // Las rutas de materias viven bajo `api/Materias`.
  // `materias-disponibles`, `docentes-disponibles` y `comisiones-disponibles`
  // envuelven la lista en `{ data }`; `mis-materias` devuelve el arreglo plano.

  /** Todas las materias del instituto, ordenadas por nombre. */
  materiasDisponibles: `${URL_BASE_API}/api/Materias/materias-disponibles`,

  /**
   * Materias en las que el alumno autenticado está inscripto, con su carrera y
   * curso. Solo `Alumno`. Un 404 con texto = el usuario no tiene perfil de alumno.
   */
  misMaterias: `${URL_BASE_API}/api/Materias/mis-materias`,

  /** Todos los docentes (fila en `Docentes`), ordenados por nombre. */
  docentesDisponibles: `${URL_BASE_API}/api/Materias/docentes-disponibles`,

  /** Todas las comisiones, ordenadas por nombre. */
  comisionesDisponibles: `${URL_BASE_API}/api/Materias/comisiones-disponibles`,

  /** Alta de una materia. Body: `CargarMateriaDto`. */
  cargarMateria: `${URL_BASE_API}/api/Materias/cargar-materia`,

  /** Asigna una materia a un docente en una comisión. Body: `AsignarMateriaDto`. */
  asignarMateria: `${URL_BASE_API}/api/Materias/asignar`,

  /**
   * Todos los alumnos, `{ data: [{ idAlumno, nombreCompleto }] }`, con el nombre
   * como "Apellido, Nombre (Legajo: X)". Sin rol. Agregado el 14/10/2026.
   */
  alumnosDisponibles: `${URL_BASE_API}/api/Materias/alumnos-disponibles`,

  /**
   * Inscribe a un alumno en una materia y comisión. Body: `{ idAlumno, idMateria,
   * idComision }`. Solo `Director` y `Secretario`. `400 { message }` si algo no
   * existe o si ya estaba inscripto. Agregado el 14/10/2026.
   */
  asignarMateriaAlumno: `${URL_BASE_API}/api/Materias/asignar-alumno`,

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

  // --- Calendario de exámenes (ISCGB_Backend/Controllers/CalendarioExamenesController.cs) ---
  // La clase se llama `ConfiguracionCalendarioController`, así que la ruta es
  // `api/ConfiguracionCalendario` aunque el archivo se llame distinto.

  /**
   * Qué días de un mes tienen exámenes y cuántos, más el límite diario. Mes de
   * 1 a 12. Solo trae los días con al menos un examen: el resto son libres. Un
   * mes inválido responde 500.
   */
  estadoMesCalendario: (anio: number, mes: number) =>
    `${URL_BASE_API}/api/ConfiguracionCalendario/estado-mes?anio=${anio}&mes=${mes}`,

  /**
   * Cambia el límite de exámenes por día. Body: `{ nuevoLimite }`. Solo se
   * puede escribir: el valor vigente se lee de `limiteDiario` en `estado-mes`.
   * Solo `Director` y `Secretario` (desde el 17/10/2026).
   */
  limiteParcialesCalendario: `${URL_BASE_API}/api/ConfiguracionCalendario/limite-parciales`,

  /**
   * Los exámenes del MES EN CURSO, con su materia, comisión y tipo:
   * `[{ idExamen, materia, fecha, comision, tipoExamen }]`, con `fecha` como
   * `DateTime` sin zona y con hora. No recibe año ni mes: el backend usa su
   * propio `DateTime.Now`, así que para otro mes no hay listado. Pide sesión,
   * sin rol. Agregado el 17/10/2026 (commit `d771acb`).
   */
  examenesDelMesEnCurso: `${URL_BASE_API}/api/ConfiguracionCalendario/del-mes`,

  /**
   * Registra un examen. Body: `{ fecha, idComision, idMateria, idTipoExamen }`, con
   * `fecha` como `DateTime` sin zona y con hora ("2026-10-13T09:00:00"). Solo
   * `Docente`: el docente sale del token y tiene que dictar esa materia (si no,
   * `400 { message }`). Responde `200 { message, idExamen }` y `400 { message }`
   * si el día ya alcanzó el límite. No valida que la comisión ni el tipo existan
   * (con ids inválidos responde 500) ni que la fecha no sea pasada.
   */
  registrarExamen: `${URL_BASE_API}/api/ConfiguracionCalendario/registrar`,

  /**
   * Cambia la fecha y la hora de un examen. Body: `{ nuevaFecha }`, un `DateTime`
   * sin zona y con hora ("2026-10-20T09:00:00"). Es lo ÚNICO que se puede cambiar:
   * ni la materia, ni la comisión, ni el tipo. Responde `200 { message }`, `404
   * { message }` si el examen no existe y `400 { message }` si el día nuevo ya
   * alcanzó el límite (el propio examen no se cuenta). No valida que la fecha no
   * sea pasada.
   */
  modificarExamen: (idExamen: number) =>
    `${URL_BASE_API}/api/ConfiguracionCalendario/modificar/${idExamen}`,

  /** Quita un examen del calendario. Responde `200 { message }` y `404 { message }` si no existe. */
  eliminarExamen: (idExamen: number) =>
    `${URL_BASE_API}/api/ConfiguracionCalendario/eliminar/${idExamen}`,

  /** Los tipos de examen: `[{ idTipoExamen, nombre }]`. Sin rol. */
  tiposDeExamen: `${URL_BASE_API}/api/ConfiguracionCalendario/tipos-examen`,

  /**
   * Las materias que dicta el docente de la sesión, cada una con su comisión. Solo
   * `Docente`: el docente sale del token. Un 404 con texto = el usuario no tiene
   * perfil de docente. Puede responder `[]`.
   */
  misMateriasDocente: `${URL_BASE_API}/api/ConfiguracionCalendario/mis-materias-docente`,

  /**
   * Las mesas de examen a las que asignaron al docente de la sesión y que siguen
   * en "Pendiente". Ojo con el nombre: el controlador es `Configuracion` (no
   * `ConfiguracionCalendario`) y la ruta dice "notificaciones", aunque el dato
   * sean mesas de examen. Solo `Docente`: el docente sale del token. Trae
   * también las de exámenes que ya pasaron. Un 404 = el usuario no tiene perfil
   * de docente.
   */
  misMesasAsignadas: `${URL_BASE_API}/api/Configuracion/mis-notificaciones`,

  // --- Mesas de examen (backend del 17/10/2026, commit `d771acb`) ---
  // Viven en tres controladores: `ConfiguracionCalendario`, `Docente` y `Configuracion`.

  /**
   * Crea la mesa y convoca a su docente, en una transacción. Body: `{ fecha,
   * idMateria, idComision, idTipoExamen, idDocente }`, con `fecha` como `DateTime`
   * sin zona y con hora. Solo `Director` y `Secretario`. Responde `200 { message,
   * idExamen }`, `400 { message }` si el docente no existe y `500 { message }`.
   */
  registrarMesaExamen: `${URL_BASE_API}/api/ConfiguracionCalendario/registrar-mesa`,

  /**
   * Convoca a otro docente a una mesa existente. Body: `{ idExamen, idDocente }`.
   * Pide `Director,Administrador`: como el rol Administrador no existe, en la
   * práctica es solo `Director`. `400 { message }` si ya estaba asignado.
   */
  asignarDocenteAMesa: `${URL_BASE_API}/api/ConfiguracionCalendario/asignar-docente`,

  /**
   * El docente de la sesión acepta o rechaza su mesa. Body: `{ idExamen, acepta }`.
   * Solo `Docente`. `404 { message }` si no la encuentra y `400 { message }` si ya
   * la respondió.
   */
  responderAsignacionMesa: `${URL_BASE_API}/api/Docente/responder-asignacion`,

  /**
   * Las mesas rechazadas sin archivar: `[{ idExamen, idDocente, docente, materia,
   * fecha, mensaje }]`, de la más próxima a la más lejana. Solo `Director` y
   * `Secretario`.
   */
  alertasRechazoMesas: `${URL_BASE_API}/api/Configuracion/alertas-rechazos`,

  /**
   * Archiva una alerta de rechazo ("Rechazada" → "Rechazada_Vista"). Body:
   * `{ idExamen, idDocente }`. Solo `Director` y `Secretario`.
   */
  ocultarAlertaRechazoMesa: `${URL_BASE_API}/api/Configuracion/ocultar-alerta-rechazo`,
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
