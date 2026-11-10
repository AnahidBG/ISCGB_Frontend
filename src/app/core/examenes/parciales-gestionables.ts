import { normalizarTexto } from '../comun/texto';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';

/**
 * Los parciales que el docente puede modificar, mover o eliminar, por su id: los
 * de las materias que dicta, en cualquiera de sus comisiones.
 *
 * Es la regla del backend desde el 10/11/2026 (`PuedeGestionarExamenAsync` en
 * `CalendarioExamenesController`): mira la materia y no la comisión, y si el
 * docente no la dicta responde 403. Sin esta cuenta el calendario le ofrecería
 * tocar cualquier parcial del mes, y el 403 lo sacaría de la pantalla.
 *
 * `del-mes` trae el NOMBRE de la materia y no su id, así que se cruza por nombre
 * normalizado. Dos materias no pueden llamarse igual: `cargar-materia` lo impide.
 */
export function parcialesGestionables(
  examenes: readonly ExamenCalendario[],
  materias: readonly MateriaDelDocente[],
): ReadonlySet<number> {
  const queDicta = new Set(materias.map((materia) => normalizarTexto(materia.materia)));
  return new Set(
    examenes
      .filter((examen) => queDicta.has(normalizarTexto(examen.materia)))
      .map((examen) => examen.idExamen),
  );
}
