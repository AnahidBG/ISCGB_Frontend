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

  it('"Mis mesas de examen" es solo del Docente, después del calendario (SCRUM-246)', () => {
    const delDocente = urlsDe('Docente');

    expect(etiquetasDe('Docente')).toContain('Mis mesas de examen');
    expect(delDocente.indexOf('/docente/mesas')).toBe(delDocente.indexOf('/calendario') + 1);
    for (const rol of ['Alumno', 'Secretario', 'Director'] as const) {
      expect(urlsDe(rol)).not.toContain('/docente/mesas');
    }
  });

  it('"Mesas de examen" es de Dirección y Secretaría, después del límite (SCRUM-245)', () => {
    for (const rol of ['Director', 'Secretario'] as const) {
      const urls = urlsDe(rol);
      expect(urls.indexOf('/mesas-examen')).toBe(urls.indexOf('/secretario/limite-parciales') + 1);
    }
    for (const rol of ['Docente', 'Alumno'] as const) {
      expect(urlsDe(rol)).not.toContain('/mesas-examen');
    }
  });

  it('"Libro de temas" es solo del Docente, después de "Mis mesas de examen" (SCRUM-232)', () => {
    const delDocente = urlsDe('Docente');

    expect(delDocente.indexOf('/docente/libro-de-temas')).toBe(
      delDocente.indexOf('/docente/mesas') + 1,
    );
    for (const rol of ['Alumno', 'Secretario', 'Director'] as const) {
      expect(urlsDe(rol)).not.toContain('/docente/libro-de-temas');
    }
  });

  it('un Director que además es Docente tiene los dos enlaces, cada uno una sola vez', () => {
    const urls = urlsDe('Director', 'Docente');

    expect(urls.filter((url) => url === '/calendario')).toHaveLength(1);
    expect(urls.filter((url) => url === '/secretario/limite-parciales')).toHaveLength(1);
  });
});
