import { formatDate } from '@angular/common';
import { ExamenCalendario } from './modelos/examen-calendario';

/**
 * ¿La persona cambió algo del parcial? El backend solo deja mover la fecha y la
 * hora (no la materia, la comisión ni el tipo), así que eso es todo lo que se
 * compara. Sin cambios no hay nada que mandar.
 */
export function hayCambiosEnElParcial(
  examen: ExamenCalendario,
  dia: string,
  horario: string,
): boolean {
  return dia !== examen.fecha || horario !== examen.horario;
}

/** El día de un texto, como se lee en una frase: "martes 13 de octubre". */
function diaEnUnaFrase(dia: string, locale: string): string {
  return formatDate(dia, "EEEE d 'de' MMMM", locale);
}

/** El aviso al reprogramar: "Parcial reprogramado para el miércoles 14 de octubre a las 10:30." */
export function avisoDeParcialReprogramado(dia: string, horario: string, locale: string): string {
  return `Parcial reprogramado para el ${diaEnUnaFrase(dia, locale)} a las ${horario}.`;
}

/** El aviso al eliminar: "Parcial de Matemática del martes 13 de octubre eliminado." */
export function avisoDeParcialEliminado(materia: string, dia: string, locale: string): string {
  return `Parcial de ${materia} del ${diaEnUnaFrase(dia, locale)} eliminado.`;
}

/** La pregunta de la confirmación: "¿Eliminar el parcial de Matemática del martes 13 de octubre?" */
export function preguntaDeEliminarParcial(materia: string, dia: string, locale: string): string {
  return `¿Eliminar el parcial de ${materia} del ${diaEnUnaFrase(dia, locale)}?`;
}
