import { RolApi } from './rol';

/**
 * Lo que el backend devuelve cuando el login sale bien (HTTP 200).
 *
 * ⚠️ Los nombres de estos campos NO los elegimos nosotros: son exactamente
 * los que manda la API hoy. El backend mezcla convenciones
 * (`telefonoEmergencia` en camelCase junto a `estado_usuario` en snake_case
 * y `lugar_Nacimiento`), y esta interfaz los replica tal cual para que
 * TypeScript nos avise si algún día cambian.
 *
 * Este es el ÚNICO lugar del frontend donde se tolera esa inconsistencia.
 * De acá para adentro trabajamos con `Sesion`, que ya está ordenada.
 */
export interface RespuestaLogin {
  token: string;
  usuario: string;
  estado_usuario: boolean;
  dni: string;
  telefono: string | null;
  telefonoEmergencia: string | null;
  lugar_Nacimiento: string | null;
  nombreContactoEmergencia: string | null;
  direccion: string | null;
  email: string;
  idUsuario: number;
  /**
   * Los roles del usuario, con id y nombre.
   *
   * Antes había que sacarlos del token, porque no venían en el cuerpo. Hoy
   * vienen acá y con su nombre, así que esta es la fuente que usamos: el
   * token queda solo para la fecha de vencimiento.
   *
   * Es un arreglo porque la base permite varios roles por persona
   * (tabla `Usuarios_roles`), aunque hoy la mayoría tenga uno solo.
   */
  roles: RolApi[];
}

/**
 * Lo que el backend devuelve cuando el login falla (HTTP 401).
 *
 * Hoy la API distingue "Contraseña incorrecta." de
 * "DNI no encontrado o cuenta inactiva.", lo que permite averiguar qué DNIs
 * existen en el instituto. Se reportó al equipo de backend.
 *
 * El frontend NO muestra este mensaje al usuario: muestra siempre uno
 * genérico (ver `MENSAJE_CREDENCIALES_INVALIDAS` en `auth.service.ts`).
 */
export interface RespuestaError {
  message: string;
}
