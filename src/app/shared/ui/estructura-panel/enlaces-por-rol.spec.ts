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
  it('"Frecuencia de avisos" es solo de Secretaría (SCRUM-151)', () => {
    const urlsDe = (...roles: Rol[]) => enlacesPorSesion(sesionDe(...roles)).map((e) => e.url);

    expect(urlsDe('Secretario')).toContain('/secretario/frecuencia-avisos');
    for (const rol of ['Director', 'Docente', 'Alumno'] as const) {
      expect(urlsDe(rol)).not.toContain('/secretario/frecuencia-avisos');
    }
  });
});
