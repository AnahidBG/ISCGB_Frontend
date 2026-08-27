import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Rol } from '../auth/modelos/rol';
import { RUTAS_API } from '../configuracion/api';
import { UsuarioInstitucional } from './modelos/usuario-institucional';
import { UsuariosService } from './usuarios.service';

/** Un rol tal como viene dentro de cada usuario en `GET /api/Usuarios`. */
interface RolApiUsuario {
  idRol: number;
  nombreRol: string | null;
}

/**
 * Forma real de cada fila del listado, tal como la arma `GetUsuarios` en
 * `UsuarioController.cs`. Confirmado leyendo el código fuente del backend
 * el 27/08/2026. Notar lo que NO trae: ningún dato de legajo.
 */
interface UsuarioApi {
  idUsuario: number;
  dni: string;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  estadoUsuario: boolean;
  roles: RolApiUsuario[];
}

interface RespuestaUsuariosApi {
  paginacion: {
    totalRegistros: number;
    totalPaginas: number;
    paginaActual: number;
    registrosPorPagina: number;
  };
  datos: UsuarioApi[];
}

/**
 * Cuántos usuarios pedir de una vez. El endpoint real pagina de a 10 por
 * default — con eso el panel del Director mostraría solo los primeros 10.
 * Mientras el instituto tenga menos usuarios que esto, pedir una sola
 * página "grande" alcanza para la "visualización global" que pide
 * ISCGB-PROJECT.md. Si el instituto real supera este número, el listado
 * queda incompleto EN SILENCIO — ver docs/alcance-dashboard-director.md.
 * El día que haga falta, la solución correcta es agregar paginación de
 * verdad al panel, no seguir subiendo este número.
 */
const REGISTROS_POR_PAGINA = 500;

/**
 * Usuarios contra la API real.
 *
 * Pega contra `GET /api/Usuarios` (`UsuariosController`), que devuelve 404
 * cuando ningún usuario matchea el filtro — se trata igual que un listado
 * vacío, no como error.
 *
 * ⚠️ GAP CONOCIDO, a propósito: la respuesta real NO trae el estado del
 * legajo de cada persona (`UsuarioApi` no tiene ese campo — el backend no
 * cruza Usuarios con Legajos en este endpoint todavía). Acá `estadoLegajo`
 * queda `null` para todos. `app-insignia-estado` ya sabe mostrar `null`
 * como "sin datos" en vez de inventar un color, así que el panel no miente:
 * antes (`UsuariosMockService`) mostraba Aprobado/Pendiente/Rechazado
 * inventados para cada persona, lo cual se veía más completo pero no
 * correspondía a ningún dato real. Si preferís seguir mostrando ese
 * maquetado completo para hacer demos mientras el backend no tiene el
 * cruce, `app.config.ts` vuelve a `UsuariosMockService` cambiando una sola
 * línea.
 */
@Injectable()
export class UsuariosHttpService extends UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioInstitucional[]> {
    const url = `${RUTAS_API.usuarios}?pagina=1&registrosPorPagina=${REGISTROS_POR_PAGINA}`;

    return this.http.get<RespuestaUsuariosApi>(url).pipe(
      map((respuesta) => (respuesta.datos ?? []).map(aUsuarioInstitucional)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        return throwError(() => error);
      }),
    );
  }
}

function aUsuarioInstitucional(usuario: UsuarioApi): UsuarioInstitucional {
  return {
    idUsuario: usuario.idUsuario,
    nombreCompleto: usuario.nombreCompleto,
    dni: usuario.dni,
    roles: (usuario.roles ?? [])
      .map((rol) => rol.nombreRol)
      .filter((nombre): nombre is string => nombre !== null && nombre.trim() !== '') as Rol[],
    // Ver el "GAP CONOCIDO" en el comentario de la clase.
    estadoLegajo: null,
  };
}
