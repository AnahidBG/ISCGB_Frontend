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
 *
 * ⚠️ El ROL no viene en esta respuesta: viaja adentro del `token`.
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
