import { Rol, ROLES } from '../../auth/modelos/rol';

/**
 * Los datos para dar de alta a una persona en el sistema.
 *
 * Los campos salen de la tabla `Usuarios` real (`ISCGB_Backend/Models/
 * Usuario.cs`, leído el 27/08/2026), no de una suposición. Ahí casi todo es
 * anulable salvo `Email`, `PasswordHash` y `EstadoUsuario` — pero "lo que la
 * base tolera" y "lo que el instituto necesita" no son lo mismo: un usuario
 * sin nombre ni DNI no sirve para nada, y sin DNI encima no puede iniciar
 * sesión, porque el login es por DNI. Por eso acá esos campos NO son
 * opcionales aunque la columna los deje pasar.
 *
 * Lo que quedó afuera a propósito:
 *
 *   · `idProvincia` — la tabla lo tiene, pero no hay endpoint que liste las
 *     provincias, así que el desplegable no se puede llenar con datos reales.
 *     Poner un campo de texto libre ahí ensuciaría una columna que apunta a
 *     otra tabla.
 *   · `tokenRecuperacion` / `expiracionToken` — los maneja el sistema cuando
 *     exista "recuperar contraseña" (Sprint 3), no se cargan a mano.
 */
export interface NuevoUsuario {
  /** Solo dígitos. Pasar por `normalizarDni()` antes de armar esto. */
  dni: string;
  nombre: string;
  apellido: string;
  email: string;

  /**
   * La contraseña con la que la persona entra por primera vez.
   *
   * ⚠️ Viaja en texto plano hacia el backend, igual que en el login: es el
   * backend el que la hashea con BCrypt antes de guardarla (`PasswordHash`).
   * Por eso este sistema TIENE que ir por HTTPS en producción — hoy corre
   * sobre `http://localhost:5231`, lo cual está bien para desarrollar y no
   * para el instituto.
   *
   * Además falta la contracara: no hay endpoint de cambio de contraseña
   * (Sprint 3), así que por ahora la persona se queda con la que le puso
   * quien la dio de alta. La pantalla lo aclara.
   */
  password: string;

  /**
   * Los roles que se le asignan. Al menos uno.
   *
   * Es un arreglo porque `Usuarios_roles` es una relación muchos a muchos y
   * el caso real existe: un director que además dicta una materia.
   *
   * Viajan por NOMBRE y no por id: el frontend no tiene de dónde sacar los
   * ids de forma confiable —no hay endpoint que liste la tabla `Roles`— y
   * hardcodear "Docente = 2" es exactamente el tipo de dato que se
   * desincroniza sin que nadie se entere. El backend, que sí tiene la tabla
   * a mano, los resuelve. Ver docs/contrato-alta-usuario.md.
   */
  roles: Rol[];

  /** `true` = puede iniciar sesión. El login rechaza a los inactivos. */
  activo: boolean;

  // ── Opcionales: la ficha personal ────────────────────────────────────────
  telefono: string | null;
  fechaNacimiento: Date | null;
  direccion: string | null;
  lugarNacimiento: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
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
    descripcion: 'Aprueba o rechaza la documentación del resto del instituto.',
  },
  {
    rol: ROLES.director,
    descripcion: 'Ve a todo el instituto y da de alta usuarios. Es el permiso más amplio.',
  },
];
