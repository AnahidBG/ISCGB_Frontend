import { Rol, RolApi } from '../../auth/modelos/rol';

/**
 * El detalle de una persona, tal como lo devuelve `GET /api/Usuarios/{id}`
 * (`UsuarioController.GetUsuarioById`).
 *
 * Es la base para precargar "Editar Usuario". Ojo con lo que NO trae:
 * CUIL, género y afiliación de emergencia no están en la respuesta (esas
 * columnas se agregaron en el backend, pero el
 * `GET` no las devuelve), así que en la edición hay que volver a cargarlas.
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

  /** Los nombres, para mostrar y para `tieneAlgunRol`. */
  roles: Rol[];

  /**
   * Los mismos roles con su id. Los usa la revisión de legajo ajeno para
   * pedir qué documentos le corresponden a ESA persona
   * (`requeridos-por-rol/{idRol}`), no a quien la está revisando.
   */
  rolesConId: RolApi[];
}
