/**
 * Los datos de contacto que una persona edita de sí misma en "Mi perfil".
 *
 * Son los que acepta `PUT /api/Usuarios/mi-perfil` (`ActualizarPerfilDto`) y que
 * `GET /api/Usuarios/{id}` también devuelve. Quedan afuera a propósito:
 *
 *   · Nombre, apellido, DNI y roles: los actualiza Dirección.
 *   · Género y afiliación de emergencia: el `PUT` los acepta, pero el `GET` no
 *     los devuelve, así que la pantalla no podría precargarlos.
 *
 * Los textos son siempre `string` (vacío = sin cargar) y la provincia `null`
 * cuando no hay ninguna: la pantalla trabaja con valores que nunca son nulos.
 * Qué viaja de todo esto lo decide `datosAEnviar` (`core/usuarios/mis-datos.ts`).
 */
export interface MisDatos {
  email: string;
  telefono: string;
  telefonoEmergencia: string;
  contactoEmergencia: string;
  direccion: string;
  lugarNacimiento: string;
  idProvincia: number | null;
}

/**
 * Los mismos datos, pero solo los que tienen contenido: lo que de verdad viaja
 * al backend. Un campo sin contenido no está (ni vacío ni `null`: no existe).
 */
export type MisDatosAEnviar = Partial<{ [campo in keyof MisDatos]: NonNullable<MisDatos[campo]> }>;
