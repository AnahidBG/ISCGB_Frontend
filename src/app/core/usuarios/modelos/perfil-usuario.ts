import { Rol, ROLES } from '../../auth/modelos/rol';

/**
 * El perfil de una persona del instituto, tal como lo da de alta o lo
 * modifica el Director — Sprint 2, "Gestión de usuarios y roles" (SCRUM-16).
 *
 * Reemplaza a los viejos `NuevoUsuario` y `DatosEditarUsuario`, que se habían
 * armado con un contrato propuesto desde el frontend (`POST /api/Usuarios`)
 * que el backend nunca implementó. El backend terminó publicando OTRO
 * contrato — `CargaUsuarioDto` en `UsuariosAdminController` (rama
 * `CargaDeUsuarios` de ISCGB_Backend, 27/09/2026) — y este modelo lo sigue
 * campo por campo:
 *
 *   · Sección "Datos personales": nombre, apellido, CUIL, DNI, correo,
 *     género, domicilio, teléfono, fecha de nacimiento, provincia.
 *   · Contacto de emergencia: nombre, teléfono y afiliación.
 *   · "Información académica": uno o más roles, y si uno es Docente,
 *     director suplente.
 *
 * ⚠️ Todos los textos son obligatorios: el proyecto del backend tiene
 * `<Nullable>enable</Nullable>` y en el DTO son `string` (no `string?`), así
 * que ASP.NET los trata como `[Required]` y responde 400 si llegan vacíos.
 * Por eso el formulario los exige a todos, aunque la columna de la base sea
 * anulable.
 *
 * Lo que NO está, y por qué:
 *
 *   · Contraseña: `CargaUsuarioDto` no la recibe. La persona nace con la
 *     contraseña pendiente y la crea ella misma en `/crear-password`, con el
 *     enlace que el backend le manda por correo. La pantalla lo avisa.
 *   · N° de legajo: el backend lo "autocompleta con el DNI" (devuelve
 *     `legajoAutocompletado = Dni`). Se muestra, no se carga.
 *   · Carrera/Especialidad: no hay columna ni campo en el DTO.
 *   · Estado activo/inactivo: el alta siempre crea la cuenta activa; la baja
 *     es un endpoint aparte (`PUT /api/UsuariosAdmin/baja/{id}`).
 */
export interface PerfilUsuario {
  nombre: string;
  apellido: string;

  /** Solo dígitos. Pasar por `normalizarDni()`. Es el usuario del login. */
  dni: string;

  /** Solo dígitos. Pasar por `normalizarCuil()`. */
  cuil: string;

  email: string;
  genero: string;
  direccion: string;
  telefono: string;

  /** Provincia de nacimiento — el país sale de la provincia (`Provincia.id_pais`). */
  idProvincia: number;

  fechaNacimiento: Date | null;

  contactoEmergencia: string;
  telefonoEmergencia: string;

  /** Obra social / prepaga de la persona, para el caso de emergencia. */
  afiliacionEmergencia: string;

  /**
   * Los roles de la persona: al menos uno.
   *
   * Hasta el 03/10/2026 era UN rol (`CargaUsuarioDto.IdRol: int`). El
   * backend pasó a `IdsRoles: List<int>` (commit `a3902df`, PR #24) y en la
   * modificación BORRA todos los roles que la persona tenía y deja solo los
   * enviados. Por eso es una lista completa y no "el rol principal": mandar
   * uno solo al editar a un Director que además es Docente le quitaría un
   * rol sin que nadie lo pidiera. Viaja como ids — ver `ID_ROL`.
   */
  roles: Rol[];

  /** Solo tiene sentido si `roles` incluye Docente. El backend admite uno solo en todo el instituto. */
  esDirectorSuplente: boolean;
}

/** Una opción del selector de roles, con su explicación. */
export interface OpcionRol {
  rol: Rol;
  descripcion: string;
}

/**
 * Los roles que el Director puede asignar, con una línea que explica qué
 * habilita cada uno.
 *
 * La explicación no es decorativa: quien da de alta a alguien está
 * repartiendo permisos sobre legajos y datos personales, y "Secretario" a
 * secas no dice que eso incluye aprobar y rechazar documentación ajena.
 *
 * Son los cuatro roles del MVP y no hay un quinto: "Preceptor" no existe
 * como rol independiente, sus funciones están dentro de Secretario
 * (CLAUDE.md, regla de negocio #5).
 */
export const OPCIONES_DE_ROL: readonly OpcionRol[] = [
  {
    rol: ROLES.alumno,
    descripcion: 'Carga su documentación y sigue el estado de su legajo.',
  },
  {
    rol: ROLES.docente,
    descripcion: 'Además entrega el programa de materia y justifica inasistencias.',
  },
  {
    rol: ROLES.secretario,
    descripcion:
      'Aprueba o rechaza la documentación del resto del instituto (incluye Preceptoría).',
  },
  {
    rol: ROLES.director,
    descripcion: 'Ve a todo el instituto y gestiona usuarios. Es el permiso más amplio.',
  },
];

/**
 * Opciones de "Sexo/Género". La columna es texto libre (`Usuarios.genero`),
 * pero un desplegable evita que la misma respuesta quede escrita de cinco
 * maneras distintas.
 */
export const OPCIONES_DE_GENERO: readonly string[] = [
  'Femenino',
  'Masculino',
  'No binario',
  'Prefiero no decirlo',
];
