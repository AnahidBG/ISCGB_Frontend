import { TipoExamen } from './modelos/tipo-examen';

/**
 * Los tipos que acepta `POST .../registrar` desde el 10/11/2026
 * (`TiposQueGestionaElDocente` en `CalendarioExamenesController`). Con cualquier
 * otro responde 400 "Tipo de examen no válido".
 */
const TIPOS_DEL_DOCENTE: readonly string[] = ['Parcial', 'Recuperatorio', 'Final'];

/**
 * De los tipos de `tipos-examen`, los que el Docente puede registrar en el
 * calendario. `tipos-examen` devuelve todos los de la base: también "Mesa de
 * Examen" (desde el 10/11/2026, el de las mesas que arman Dirección y
 * Secretaría) y otros como "Coloquio" o "Recupetario", que hay en algunas.
 * Ofrecerlos sería un 400 seguro.
 *
 * Es una lista blanca con comparación exacta, como la del backend: un tipo nuevo
 * en la base no aparece hasta que `registrar` lo acepte. Las mesas de examen no
 * pasan por acá: `registrar-mesa` no recibe tipo.
 */
export function tiposQueRegistraElDocente(tipos: readonly TipoExamen[]): TipoExamen[] {
  return tipos.filter((tipo) => TIPOS_DEL_DOCENTE.includes(tipo.nombre));
}
