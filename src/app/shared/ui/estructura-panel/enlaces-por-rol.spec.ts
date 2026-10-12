import { Rol } from '../../../core/auth/modelos/rol';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { enlacesPorSesion } from './enlaces-por-rol';

function sesionDe(...roles: Rol[]): Sesion {
  return {
    token: 't',
    idUsuario: 1,
    nombreCompleto: 'Persona de Prueba',
    dni: '12345678',
    email: 'persona@ejemplo.com',
    roles,
    venceEl: new Date(Date.now() + 60_000),
  };
}

describe('enlacesPorSesion', () => {
  const urlsDe = (...roles: Rol[]) => enlacesPorSesion(sesionDe(...roles)).map((e) => e.url);
  const etiquetasDe = (...roles: Rol[]) =>
    enlacesPorSesion(sesionDe(...roles)).map((e) => e.etiqueta);

  it('"Frecuencia de avisos" es solo de Secretaría (SCRUM-151)', () => {
    expect(urlsDe('Secretario')).toContain('/secretario/frecuencia-avisos');
    for (const rol of ['Director', 'Docente', 'Alumno'] as const) {
      expect(urlsDe(rol)).not.toContain('/secretario/frecuencia-avisos');
    }
  });

  it('"Límite de parciales" es de Secretaría y Dirección, y para Secretaría va después de "Frecuencia de avisos"', () => {
    const delSecretario = urlsDe('Secretario');

    expect(delSecretario.indexOf('/secretario/limite-parciales')).toBe(
      delSecretario.indexOf('/secretario/frecuencia-avisos') + 1,
    );
    expect(etiquetasDe('Secretario')).toContain('Límite de parciales');
    expect(etiquetasDe('Director')).toContain('Límite de parciales');
    for (const rol of ['Docente', 'Alumno'] as const) {
      expect(urlsDe(rol)).not.toContain('/secretario/limite-parciales');
    }
  });

  it('"Calendario de parciales" es del Docente y el Alumno ya no lo tiene', () => {
    expect(etiquetasDe('Docente')).toContain('Calendario de parciales');
    expect(urlsDe('Docente')).toContain('/calendario');

    for (const rol of ['Alumno', 'Secretario', 'Director'] as const) {
      expect(urlsDe(rol)).not.toContain('/calendario');
    }
  });

  it('un Director que además es Docente tiene los dos enlaces, cada uno una sola vez', () => {
    const urls = urlsDe('Director', 'Docente');

    expect(urls.filter((url) => url === '/calendario')).toHaveLength(1);
    expect(urls.filter((url) => url === '/secretario/limite-parciales')).toHaveLength(1);
  });
});
