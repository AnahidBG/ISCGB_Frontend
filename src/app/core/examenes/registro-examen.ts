import { formatDate } from '@angular/common';
import { aFechaSola, desdeFechaSola } from '../comun/fechas';

/** Un horario de 24 h: "09:00", "23:59". Es lo que entrega un `<input type="time">`. */
const HORARIO_DE_24_HORAS = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Un día sin hora: "2026-10-13". Es lo que entrega un `<input type="date">`. */
const TEXTO_DE_DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * La fecha y la hora que recibe el backend al registrar un examen:
 * "2026-10-13T09:00:00".
 *
 * El backend guarda un `DateTime` de .NET SIN zona, con la hora tal cual la
 * escribió la persona. Por eso el texto se arma a mano y no con
 * `new Date(...).toISOString()`: ese método pasa todo a UTC y, en Argentina
 * (UTC-3), un parcial a las 23:30 caería al día siguiente y uno a las 09:00
 * saldría a las 12:00.
 *
 * Espera un día y un horario que ya pasaron por `errorDeDia` y `errorDeHorario`.
 */
export function textoFechaYHora(dia: string, horario: string): string {
  return `${dia}T${horario}:00`;
}

/**
 * Por qué no se puede guardar ese horario, o `null` si está bien.
 *
 * Tiene que ser una hora de 24 h ("09:00", "18:30"). Un `<input type="time">`
 * vacío o incompleto entrega `''`.
 */
export function errorDeHorario(horario: string | null): string | null {
  if (horario === null || horario === '') {
    return 'Ingresá el horario del parcial.';
  }
  if (!HORARIO_DE_24_HORAS.test(horario)) {
    return 'Ingresá un horario válido en formato 24 h, por ejemplo 09:00.';
  }
  return null;
}

/**
 * Por qué no se puede guardar ese día, o `null` si está bien.
 *
 * Tiene que ser una fecha que exista y no ser anterior a `hoy`: el backend no lo
 * valida, así que la regla vive en el frontend. Hoy cuenta como válido. Recibe
 * `hoy` por parámetro para seguir siendo una función pura.
 */
export function errorDeDia(dia: string | null, hoy: Date): string | null {
  if (dia === null || dia === '') {
    return 'Elegí la fecha del parcial.';
  }

  // `desdeFechaSola` normaliza "2026-02-30" a marzo: si la vuelta no da lo mismo,
  // el día no existe.
  const fecha = TEXTO_DE_DIA.test(dia) ? desdeFechaSola(dia) : null;
  if (fecha === null || aFechaSola(fecha) !== dia) {
    return 'La fecha no es válida.';
  }

  // Las fechas "yyyy-MM-dd" se ordenan igual como texto que como fechas.
  if (dia < aFechaSola(hoy)) {
    return 'No se puede registrar un parcial en una fecha pasada.';
  }
  return null;
}

/**
 * El día en palabras, con la inicial en mayúscula: "Martes 13 de octubre de
 * 2026". Los nombres salen del locale (`LOCALE_ID`), que tiene que estar
 * registrado; el español no los escribe con mayúscula, de ahí el ajuste.
 */
export function diaEnPalabras(dia: string, locale: string): string {
  const texto = formatDate(dia, "EEEE d 'de' MMMM 'de' y", locale);
  return texto.charAt(0).toLocaleUpperCase(locale) + texto.slice(1);
}

/** El aviso al registrar un parcial: "Parcial registrado para el martes 13 de octubre a las 09:00." */
export function avisoDeParcialRegistrado(dia: string, horario: string, locale: string): string {
  return `Parcial registrado para el ${formatDate(dia, "EEEE d 'de' MMMM", locale)} a las ${horario}.`;
}
