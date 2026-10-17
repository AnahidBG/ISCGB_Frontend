import { formatDate } from '@angular/common';
import { MesaAsignada } from '../examenes/modelos/mesa-asignada';

/**
 * Las mesas que el docente todavía puede responder: desde el inicio de HOY, de
 * la más próxima a la más lejana. El backend devuelve también las de exámenes
 * que ya pasaron, y responder esas no tiene sentido. Mismo corte que la campana
 * (`notificacionesPorMesas`): la mesa de esta mañana sigue hasta que termina el día.
 *
 * Recibe `hoy` por parámetro para seguir siendo una función pura.
 */
export function mesasPorResponder(mesas: readonly MesaAsignada[], hoy: Date): MesaAsignada[] {
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return mesas
    .filter((mesa) => mesa.fecha.getTime() >= inicioDeHoy)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/**
 * "Viernes 20 de noviembre de 2026, 09:00 h". Los nombres salen del locale
 * (`LOCALE_ID`), que tiene que estar registrado; el español no los escribe con
 * mayúscula, de ahí el ajuste.
 */
export function fechaDeMesa(fecha: Date, locale: string): string {
  const texto = formatDate(fecha, "EEEE d 'de' MMMM 'de' y, HH:mm 'h'", locale);
  return texto.charAt(0).toLocaleUpperCase(locale) + texto.slice(1);
}

/** "viernes 20 de noviembre, 09:00 h": para usar dentro de una oración. */
export function cuandoEsLaMesa(fecha: Date, locale: string): string {
  return formatDate(fecha, "EEEE d 'de' MMMM, HH:mm 'h'", locale);
}

/**
 * Lo que se le confirma al docente después de responder. Se arma acá y no se
 * muestra el texto del backend ("Ha aceptada la asignación…"), que no dice de
 * qué mesa se trata.
 */
export function confirmacionDeRespuesta(mesa: MesaAsignada, acepta: boolean, locale: string): string {
  const cuando = cuandoEsLaMesa(mesa.fecha, locale);
  return acepta
    ? `Aceptaste la mesa de ${mesa.materia} del ${cuando}.`
    : `Rechazaste la mesa de ${mesa.materia} del ${cuando}. ` +
        'Dirección y Secretaría reciben el aviso para reasignarla.';
}
