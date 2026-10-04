import { Rol, ROLES } from '../auth/modelos/rol';
import { UsuarioInstitucional } from './modelos/usuario-institucional';

export type FiltroEstadoUsuario = 'todos' | 'activos' | 'inactivos';
export type FiltroRolUsuario = 'todos' | Rol;

export interface FiltrosUsuarios {
  texto: string;
  rol: FiltroRolUsuario;
  estado: FiltroEstadoUsuario;
}

/** Filtra personas por texto, rol y estado de la cuenta sin mutar la lista original. */
export function filtrarUsuarios(
  usuarios: UsuarioInstitucional[],
  filtros: FiltrosUsuarios,
): UsuarioInstitucional[] {
  const texto = filtros.texto.trim().toLocaleLowerCase();

  return usuarios.filter((usuario) => {
    const coincideTexto =
      texto === '' ||
      [usuario.nombreCompleto, usuario.dni, usuario.email ?? ''].some((valor) =>
        valor.toLocaleLowerCase().includes(texto),
      );
    const coincideRol = filtros.rol === 'todos' || usuario.roles.includes(filtros.rol);
    const coincideEstado =
      filtros.estado === 'todos' ||
      (filtros.estado === 'activos' ? usuario.activo : !usuario.activo);

    return coincideTexto && coincideRol && coincideEstado;
  });
}

export const ROLES_LISTADO_SECRETARIO: readonly Rol[] = [ROLES.docente, ROLES.alumno];
