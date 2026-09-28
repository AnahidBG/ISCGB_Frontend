import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Rol } from '../auth/modelos/rol';
import { RUTAS_API } from '../configuracion/api';
import { DatosEditarUsuario } from './modelos/datos-editar-usuario';
import { NuevoUsuario } from './modelos/nuevo-usuario';
import { UsuarioDetalle } from './modelos/usuario-detalle';
import { UsuarioInstitucional } from './modelos/usuario-institucional';
import {
  MENSAJE_ALTA_NO_DISPONIBLE,
  MENSAJE_EDICION_NO_DISPONIBLE,
  MENSAJE_ERROR_ALTA_USUARIO,
  MENSAJE_ERROR_EDITAR_USUARIO,
  MENSAJE_USUARIO_DUPLICADO,
  UsuariosService,
} from './usuarios.service';

/** Lo que devuelve `GetUsuarioById` (`UsuarioController.cs`). YA es real. */
interface UsuarioDetalleApi {
  idUsuario: number;
  dni: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  telefonoEmergencia: string | null;
  lugarNacimiento: string | null;
  contactoEmergencia: string | null;
  direccion: string | null;
  idProvincia: number | null;
  fechaNac: string | null;
  estadoUsuario: boolean;
  roles: { idRol: number; nombreRol: string | null }[];
}

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

  /**
   * Alta de usuario.
   *
   * Los nombres del cuerpo son los que pide `docs/contrato-alta-usuario.md`.
   * Todavía no hay nadie del otro lado escuchando: ver el comentario del
   * método abstracto en `usuarios.service.ts`.
   */
  crear(usuario: NuevoUsuario): Observable<void> {
    const cuerpo = {
      dni: usuario.dni,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      password: usuario.password,
      roles: usuario.roles,
      estadoUsuario: usuario.activo,
      telefono: usuario.telefono,
      // Solo la fecha, sin hora: la columna es `DateOnly` en el backend.
      fechaNac: usuario.fechaNacimiento === null ? null : aFechaSola(usuario.fechaNacimiento),
      direccion: usuario.direccion,
      lugarNacimiento: usuario.lugarNacimiento,
      contactoEmergencia: usuario.contactoEmergencia,
      telefonoEmergencia: usuario.telefonoEmergencia,
    };

    return this.http.post(RUTAS_API.usuarios, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        // 404 = la ruta no existe; 405 = existe pero no acepta POST. Las dos
        // significan lo mismo para quien está usando la pantalla: el endpoint
        // todavía no está publicado.
        if (error.status === 404 || error.status === 405) {
          return throwError(() => new Error(MENSAJE_ALTA_NO_DISPONIBLE));
        }

        // 409 es el código correcto para "ya existe"; algunos backends usan
        // 400 con un mensaje. Se contemplan los dos para no mostrar un error
        // genérico ante el caso más común del alta: el DNI repetido.
        if (error.status === 409) {
          return throwError(() => new Error(MENSAJE_USUARIO_DUPLICADO));
        }

        console.error('Error al dar de alta el usuario:', error);
        return throwError(() => new Error(MENSAJE_ERROR_ALTA_USUARIO));
      }),
    );
  }

  /**
   * El detalle completo de una persona. YA es real —
   * `GET /api/Usuarios/{id}` existe y funciona (confirmado con Swagger el
   * 25/09/2026), a diferencia de `crear`/`actualizar`.
   */
  obtener(idUsuario: number): Observable<UsuarioDetalle> {
    return this.http.get<UsuarioDetalleApi>(RUTAS_API.usuarioPorId(idUsuario)).pipe(
      map(aUsuarioDetalle),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer el detalle del usuario:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Edición de usuario.
   *
   * Mismo cuerpo que `crear` (menos `dni` y `password`, que acá no se
   * tocan) — es el contrato YA documentado en `docs/contrato-alta-usuario.md`,
   * no uno nuevo. Ver el comentario de `DatosEditarUsuario` sobre por qué
   * no se agregan los campos nuevos del criterio de Sprint 2 (CUIL, Sexo,
   * etc.) acá todavía.
   */
  actualizar(idUsuario: number, datos: DatosEditarUsuario): Observable<void> {
    const cuerpo = {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      roles: datos.roles,
      estadoUsuario: datos.activo,
      telefono: datos.telefono,
      fechaNac: datos.fechaNacimiento === null ? null : aFechaSola(datos.fechaNacimiento),
      direccion: datos.direccion,
      lugarNacimiento: datos.lugarNacimiento,
      contactoEmergencia: datos.contactoEmergencia,
      telefonoEmergencia: datos.telefonoEmergencia,
    };

    return this.http.put(RUTAS_API.usuarioPorId(idUsuario), cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        // 404 = la ruta no existe; 405 = existe pero no acepta PUT. Mismo
        // criterio que `crear`: el endpoint todavía no está publicado.
        if (error.status === 404 || error.status === 405) {
          return throwError(() => new Error(MENSAJE_EDICION_NO_DISPONIBLE));
        }

        console.error('Error al editar el usuario:', error);
        return throwError(() => new Error(MENSAJE_ERROR_EDITAR_USUARIO));
      }),
    );
  }
}

/** Normaliza el detalle real de `GetUsuarioById`. */
function aUsuarioDetalle(usuario: UsuarioDetalleApi): UsuarioDetalle {
  return {
    idUsuario: usuario.idUsuario,
    dni: usuario.dni,
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    email: usuario.email ?? '',
    telefono: usuario.telefono,
    telefonoEmergencia: usuario.telefonoEmergencia,
    lugarNacimiento: usuario.lugarNacimiento,
    contactoEmergencia: usuario.contactoEmergencia,
    direccion: usuario.direccion,
    idProvincia: usuario.idProvincia,
    fechaNac: usuario.fechaNac === null ? null : new Date(usuario.fechaNac),
    estadoUsuario: usuario.estadoUsuario,
    roles: (usuario.roles ?? [])
      .map((rol) => rol.nombreRol)
      .filter((nombre): nombre is string => nombre !== null && nombre.trim() !== '') as Rol[],
  };
}

/** `Date` → "2026-08-27", que es lo que espera un `DateOnly` de .NET. */
function aFechaSola(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
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
