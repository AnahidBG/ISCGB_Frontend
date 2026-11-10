import { TipoExamen } from './modelos/tipo-examen';

/**
 * Los tipos que acepta `POST .../registrar` desde el 10/11/2026
 * (`TiposQueGestionaElDocente` en `CalendarioExamenesController`). Con cualquier
 * otro responde 400 "Tipo de examen no válido".
 */
const TIPOS_DEL_DOCENTE: readonly string[] = ['Parcial', 'Recuperatorio', 'Final'];

/**
 * De los tipos de `tipos-examen`, los que el Docente puede registrar en el
 * calendario. `tipos-examen` devuelve todos los de la base (también "Coloquio" o
 * "Recupetario", que hay en algunas), y ofrecerlos sería un 400 seguro.
 *
 * La comparación es exacta, como la del backend. Las mesas de examen no pasan por
 * acá: `registrar-mesa` acepta cualquier tipo.
 */
export function tiposQueRegistraElDocente(tipos: readonly TipoExamen[]): TipoExamen[] {
  return tipos.filter((tipo) => TIPOS_DEL_DOCENTE.includes(tipo.nombre));
}
