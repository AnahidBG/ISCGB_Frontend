import { ExamenCalendario } from './modelos/examen-calendario';

/**
 * Los exámenes que quien mira puede modificar, mover o eliminar, por su id.
 *
 * Lo decide el backend en cada examen (`puedeModificar` de `del-mes`, desde el
 * 10/11/2026): Director y Secretario pueden con todos; un docente, solo con los
 * Parciales, Recuperatorios o Finales que cargó él, nunca con una mesa que armó
 * Dirección o Secretaría. Con los demás responde 403, así que el calendario no
 * los ofrece. Antes el frontend lo deducía cruzando por nombre con las materias
 * que dicta, y esa regla ya no es la del backend.
 */
export function parcialesGestionables(examenes: readonly ExamenCalendario[]): ReadonlySet<number> {
  return new Set(
    examenes.filter((examen) => examen.puedeModificar).map((examen) => examen.idExamen),
  );
}
