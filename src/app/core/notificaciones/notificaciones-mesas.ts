import { DIAS_DE_LA_SEMANA } from '../examenes/calendario-mes';
import { MesaAsignada } from '../examenes/modelos/mesa-asignada';
import { NotificacionPanel } from './modelos/notificacion-panel';

/** A dónde lleva el aviso de una mesa: al calendario, que es donde se ve el día. */
const URL_CALENDARIO = '/calendario';

function conDosDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

/**
 * "Viernes 20/11/2026, 09:00 h".
 *
 * Armado a mano, con la lista fija de días del calendario, y no con
 * `toLocaleDateString`: el texto no depende del idioma del navegador ni de los
 * datos de ICU del entorno, y así es el mismo en los tests.
 */
function fechaYHora(fecha: Date): string {
  // `getDay()` cuenta desde el domingo (0) y la lista arranca en el lunes.
  const dia = DIAS_DE_LA_SEMANA[(fecha.getDay() + 6) % 7].largo;
  const dma = `${conDosDigitos(fecha.getDate())}/${conDosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  const hora = `${conDosDigitos(fecha.getHours())}:${conDosDigitos(fecha.getMinutes())}`;
  return `${dia} ${dma}, ${hora} h`;
}

/**
 * Las mesas de examen a las que asignaron al docente, como novedades de la
 * campana.
 *
 * El backend devuelve TODAS las que siguen sin respuesta, también las de
 * exámenes que ya pasaron. Descartarlas es una decisión del front: una mesa
 * vieja no es una novedad sobre la que se pueda hacer algo, y dejarla sumaría
 * al número de la campana para siempre. Cuenta desde el inicio de HOY, no desde
 * la hora actual: la mesa de esta mañana se sigue avisando hasta que termina
 * el día.
 *
 * Van de la más próxima a la más lejana. Cada mesa lleva su fecha en el
 * detalle, y eso la distingue de otra de la misma materia: la campana
 * identifica cada aviso por título, detalle, enlace y tono.
 *
 * Es una función pura: recibe `hoy` por parámetro y no sabe de dónde salen las
 * mesas.
 */
export function notificacionesPorMesas(
  mesas: readonly MesaAsignada[],
  hoy: Date,
): NotificacionPanel[] {
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  return mesas
    .filter((mesa) => mesa.fecha.getTime() >= inicioDeHoy)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map((mesa) => ({
      titulo: `Te asignaron a la mesa de ${mesa.materia}`,
      detalle: fechaYHora(mesa.fecha),
      url: URL_CALENDARIO,
      tono: 'pendiente' as const,
    }));
}
