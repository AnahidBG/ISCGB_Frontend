import { Sesion } from './modelos/sesion';
import { rolPrincipalDe } from './rol-principal';

function sesionCon(roles: string[]): Sesion {
  return {
    token: 'token-de-prueba',
    idUsuario: 1,
    nombreCompleto: 'Milena Previgliano',
    dni: '40000000',
    email: 'milena@iscgb.edu.ar',
    roles,
    venceEl: new Date('2026-12-31'),
  };
}

describe('rolPrincipalDe', () => {
  it('sin sesión no muestra ningún rol', () => {
    expect(rolPrincipalDe(null)).toBe('');
  });

  it('con un solo rol muestra ese', () => {
    expect(rolPrincipalDe(sesionCon(['Director']))).toBe('Director');
    expect(rolPrincipalDe(sesionCon(['Secretario']))).toBe('Secretario');
    expect(rolPrincipalDe(sesionCon(['Docente']))).toBe('Docente');
    expect(rolPrincipalDe(sesionCon(['Alumno']))).toBe('Alumno');
  });

  it('con varios roles gana el de mayor alcance, sin importar el orden', () => {
    // El caso real del instituto: Dirección que además dicta una materia.
    expect(rolPrincipalDe(sesionCon(['Docente', 'Director']))).toBe('Director');
    expect(rolPrincipalDe(sesionCon(['Director', 'Docente']))).toBe('Director');
    expect(rolPrincipalDe(sesionCon(['Alumno', 'Secretario']))).toBe('Secretario');
    expect(rolPrincipalDe(sesionCon(['Docente', 'Alumno']))).toBe('Docente');
  });

  it('no depende del orden en que el backend devuelva los roles', () => {
    const unOrden = rolPrincipalDe(sesionCon(['Docente', 'Secretario', 'Director']));
    const otroOrden = rolPrincipalDe(sesionCon(['Director', 'Secretario', 'Docente']));

    expect(unOrden).toBe(otroOrden);
  });

  it('un rol desconocido se muestra tal cual en vez de dejar el lugar vacío', () => {
    expect(rolPrincipalDe(sesionCon(['Bedel']))).toBe('Bedel');
  });

  it('sin ningún rol no inventa uno', () => {
    expect(rolPrincipalDe(sesionCon([]))).toBe('');
  });
});
