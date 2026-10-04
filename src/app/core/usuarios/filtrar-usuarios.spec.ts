import { describe, expect, it } from 'vitest';
import { ROLES } from '../auth/modelos/rol';
import { filtrarUsuarios } from './filtrar-usuarios';
import { UsuarioInstitucional } from './modelos/usuario-institucional';

const usuarios: UsuarioInstitucional[] = [
  {
    idUsuario: 1,
    nombreCompleto: 'Ana Docente',
    dni: '30111222',
    email: 'ana@iscgb.edu.ar',
    roles: [ROLES.docente],
    activo: true,
    estadoLegajo: null,
  },
  {
    idUsuario: 2,
    nombreCompleto: 'Bruno Alumno',
    dni: '40111222',
    email: 'bruno@iscgb.edu.ar',
    roles: [ROLES.alumno],
    activo: false,
    estadoLegajo: null,
  },
];

describe('filtrarUsuarios', () => {
  it('filtra por texto y rol', () => {
    expect(
      filtrarUsuarios(usuarios, { texto: 'ana', rol: ROLES.docente, estado: 'todos' }),
    ).toEqual([usuarios[0]]);
  });

  it('filtra cuentas activas e inactivas', () => {
    expect(filtrarUsuarios(usuarios, { texto: '', rol: 'todos', estado: 'activos' })).toEqual([
      usuarios[0],
    ]);
    expect(filtrarUsuarios(usuarios, { texto: '', rol: 'todos', estado: 'inactivos' })).toEqual([
      usuarios[1],
    ]);
  });
});
