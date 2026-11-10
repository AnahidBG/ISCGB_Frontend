import { Rol, RolApi } from '../../auth/modelos/rol';

/**
 * El detalle de una persona, tal como lo devuelve `GET /api/Usuarios/{id}`
 * (`UsuarioController.GetUsuarioById`).
 *
 * Es la base para precargar "Editar Usuario". Desde el 10/11/2026 trae también
 * lo que carga el alta y la edición necesita mostrar: CUIL, género, afiliación
 * de emergencia, si es director suplente y el N.° de legajo.
 */
export interface UsuarioDetalle {
  idUsuario: number;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  telefonoEmergencia: string | null;
  lugarNacimiento: string | null;
  contactoEmergencia: string | null;
  direccion: string | null;
  idProvincia: number | null;
  fechaNac: Date | null;
  estadoUsuario: boolean;

  /** Solo dígitos, como se guarda. `null` si no está cargado. */
  cuil: string | null;
  genero: string | null;
  afiliacionEmergencia: string | null;

  /** Si alguno de sus perfiles de docente es el director suplente. */
  esDirectorSuplente: boolean;

  /**
   * El N.° de legajo de su perfil de alumno, o `null` si no es alumno. Al darlo
   * de alta es el DNI, pero puede haberse cargado otro a mano.
   */
  legajo: string | null;

  /** Los nombres, para mostrar y para `tieneAlgunRol`. */
  roles: Rol[];

  /**
   * Los mismos roles con su id. Los usa la revisión de legajo ajeno para
   * pedir qué documentos le corresponden a ESA persona
   * (`requeridos-por-rol/{idRol}`), no a quien la está revisando.
   */
  rolesConId: RolApi[];
}
