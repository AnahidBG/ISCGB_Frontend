import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import {
  avisoDeParcialRegistrado,
  diaEnPalabras,
  errorDeDia,
  errorDeHorario,
  textoFechaYHora,
} from './registro-examen';

registerLocaleData(localeEsAr);

describe('textoFechaYHora', () => {
  it('arma la fecha y la hora que espera un DateTime de .NET, sin zona', () => {
    expect(textoFechaYHora('2026-10-13', '09:00')).toBe('2026-10-13T09:00:00');
  });

  it('no corre la hora por UTC: a las 23:30 sigue siendo el mismo día', () => {
    // `toISOString()` pasaría esto a UTC y, en Argentina, lo mandaría al día siguiente.
    const texto = textoFechaYHora('2026-10-13', '23:30');

    expect(texto).toBe('2026-10-13T23:30:00');
    expect(texto).not.toMatch(/Z$|[+-]\d{2}:\d{2}$/);
  });
});

describe('errorDeHorario', () => {
  it.each(['00:00', '23:59'])('%s es un horario válido', (horario) => {
    expect(errorDeHorario(horario)).toBeNull();
  });

  it.each([
    ['vacío', '', 'Ingresá el horario del parcial.'],
    ['sin dato', null, 'Ingresá el horario del parcial.'],
    [
      'la hora fuera de 24 h',
      '24:00',
      'Ingresá un horario válido en formato 24 h, por ejemplo 09:00.',
    ],
    [
      'los minutos fuera de rango',
      '10:60',
      'Ingresá un horario válido en formato 24 h, por ejemplo 09:00.',
    ],
    [
      'en formato de 12 h',
      '9:00 PM',
      'Ingresá un horario válido en formato 24 h, por ejemplo 09:00.',
    ],
  ])('%s no se puede guardar, y dice por qué', (_caso, horario, mensaje) => {
    expect(errorDeHorario(horario)).toBe(mensaje);
  });
});

describe('errorDeDia', () => {
  const hoy = new Date(2026, 9, 10, 12);

  it('hoy y los días que vienen son válidos', () => {
    expect(errorDeDia('2026-10-10', hoy)).toBeNull();
    expect(errorDeDia('2026-10-13', hoy)).toBeNull();
  });

  it.each([
    ['vacío', '', 'Elegí la fecha del parcial.'],
    ['sin dato', null, 'Elegí la fecha del parcial.'],
    ['un día pasado', '2026-10-09', 'No se puede registrar un parcial en una fecha pasada.'],
    ['un día que no existe', '2026-02-30', 'La fecha no es válida.'],
    ['un texto que no es una fecha', 'pronto', 'La fecha no es válida.'],
  ])('%s no se puede guardar, y dice por qué', (_caso, dia, mensaje) => {
    expect(errorDeDia(dia, hoy)).toBe(mensaje);
  });
});

describe('textos del día', () => {
  it('el día en palabras lleva la inicial en mayúscula y el año', () => {
    expect(diaEnPalabras('2026-10-13', 'es-AR')).toBe('Martes 13 de octubre de 2026');
  });

  it('el aviso de éxito nombra el día y la hora del parcial', () => {
    expect(avisoDeParcialRegistrado('2026-10-13', '09:00', 'es-AR')).toBe(
      'Parcial registrado para el martes 13 de octubre a las 09:00.',
    );
  });
});
