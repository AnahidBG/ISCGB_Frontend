import { RolApi } from '../auth/modelos/rol';
import { Sesion } from '../auth/modelos/sesion';
import { declaraEntregaEnPapel } from './entrega-en-papel';

function sesionCon(rolesConId: RolApi[] | undefined): Sesion {
  return {
    token: 't',
    idUsuario: 1,
    nombreCompleto: 'Ana Gómez',
    dni: '12345678',
    email: 'ana@ejemplo.com',
    roles: (rolesConId ?? []).map((rol) => rol.nombreRol ?? ''),
    rolesConId,
    venceEl: new Date(Date.now() + 60_000),
  };
}

describe('declaraEntregaEnPapel', () => {
  it('un Docente declara él mismo que entregó el papel', () => {
    expect(declaraEntregaEnPapel(sesionCon([{ idRol: 3, nombreRol: 'Docente' }]))).toBe(true);
  });

  it('un Alumno no: solo ve el recordatorio', () => {
    expect(declaraEntregaEnPapel(sesionCon([{ idRol: 4, nombreRol: 'Alumno' }]))).toBe(false);
  });

  it('un Director que además da clase presenta como Docente, así que también declara', () => {
    const sesion = sesionCon([
      { idRol: 1, nombreRol: 'Director' },
      { idRol: 3, nombreRol: 'Docente' },
    ]);
    expect(declaraEntregaEnPapel(sesion)).toBe(true);
  });

  it('Secretario o Director sin docencia no declaran (caso por defecto)', () => {
    expect(declaraEntregaEnPapel(sesionCon([{ idRol: 2, nombreRol: 'Secretario' }]))).toBe(false);
    expect(declaraEntregaEnPapel(sesionCon([{ idRol: 1, nombreRol: 'Director' }]))).toBe(false);
  });

  it('sin sesión, o sin los ids de los roles, no muestra la casilla', () => {
    expect(declaraEntregaEnPapel(null)).toBe(false);
    expect(declaraEntregaEnPapel(sesionCon(undefined))).toBe(false);
  });
});
