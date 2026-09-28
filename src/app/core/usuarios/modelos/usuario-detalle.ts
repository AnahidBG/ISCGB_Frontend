import { Rol } from '../../auth/modelos/rol';

/**
 * El detalle completo de una persona, tal como lo devuelve
 * `GET /api/Usuarios/{id}` (`UsuarioController.GetUsuarioById`, YA REAL —
 * confirmado con Swagger el 25/09/2026, a diferencia del listado y del alta).
 *
 * Es la base para precargar "Editar Usuario": a diferencia de
 * `UsuarioInstitucional` (la fila liviana del listado), este trae todos los
 * campos de la ficha personal.
 */
export interface UsuarioDetalle {
  idUsuario: number;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  telefonoEmergencia: string | null;

  /**
   * Hoy es un solo campo de texto libre en la base (`lugar_nacimiento`).
   * El criterio nuevo pide Provincia y País por separado — ver el comentario
   * en `DatosEditarUsuario` sobre cómo se parte acá sin inventar una
   * columna que la base no tiene.
   */
  lugarNacimiento: string | null;

  contactoEmergencia: string | null;
  direccion: string | null;
  idProvincia: number | null;
  fechaNac: Date | null;
  estadoUsuario: boolean;
  roles: Rol[];
}
