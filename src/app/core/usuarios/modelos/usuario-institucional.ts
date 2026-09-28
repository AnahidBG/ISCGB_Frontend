import { Rol } from '../../auth/modelos/rol';

/**
 * Una persona del instituto, tal como la lista el panel del Director.
 *
 * Sale de `GET /api/Usuarios` (`UsuarioController.GetUsuarios`), que trae
 * DNI, nombre, correo, estado de la cuenta y roles — pero NO el legajo.
 * El estado del legajo lo completa el panel cruzando con
 * `GET /api/Legajos/resumen-estado` (ver `estadoGeneralDelLegajo`).
 */
export interface UsuarioInstitucional {
  idUsuario: number;
  nombreCompleto: string;
  dni: string;
  email: string | null;

  /** Puede tener más de un rol — igual que `Sesion.roles`. */
  roles: Rol[];

  /** `false` = dado de baja: no puede iniciar sesión, pero sus datos siguen. */
  activo: boolean;

  /**
   * Estado general del legajo de esa persona, o `null` si no presentó nada.
   *
   * Es `string | null`, no un enum: la base guarda `estado` como
   * `varchar(50) NULL`, así que el frontend no puede dar por hecho que va a
   * recibir solo uno de los tres valores esperados. `app-insignia-estado` ya
   * maneja ese caso.
   */
  estadoLegajo: string | null;
}
