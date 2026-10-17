import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { ID_ROL, ROLES, Rol, RolApi } from '../auth/modelos/rol';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { RUTAS_API, urlArchivoSubido } from '../configuracion/api';
import { datosAEnviar } from './mis-datos';
import { MisDatos } from './modelos/mis-datos';
import { PerfilUsuario } from './modelos/perfil-usuario';
import { Provincia } from './modelos/provincia';
import { UsuarioDetalle } from './modelos/usuario-detalle';
import { UsuarioInstitucional } from './modelos/usuario-institucional';
import {
  MENSAJE_ERROR_ACTUALIZAR_MIS_DATOS,
  MENSAJE_ERROR_ALTA_USUARIO,
  MENSAJE_ERROR_BAJA_USUARIO,
  MENSAJE_ERROR_EDITAR_USUARIO,
  MENSAJE_ERROR_REACTIVAR_USUARIO,
  MENSAJE_ERROR_SUBIR_FOTO,
  MENSAJE_GESTION_NO_DISPONIBLE,
  UsuariosService,
  mensajePerfilActualizado,
} from './usuarios.service';

/** Lo que devuelve `GetUsuarioById` (`UsuarioController.cs`). */
interface UsuarioDetalleApi {
  idUsuario: number;
  dni: string | null;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  telefonoEmergencia: string | null;
  lugarNacimiento: string | null;
  contactoEmergencia: string | null;
  direccion: string | null;
  idProvincia: number | null;
  /** `DateOnly?` → "1990-05-14", sin hora. */
  fechaNac: string | null;
  estadoUsuario: boolean;
  roles: RolApi[] | null;
}

/** Cada fila de `GetUsuarios` (`UsuarioController.cs`). No trae nada del legajo. */
interface UsuarioApi {
  idUsuario: number;
  dni: string | null;
  nombreCompleto: string | null;
  email: string | null;
  telefono: string | null;
  estadoUsuario: boolean;
  roles: RolApi[] | null;
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
 * `CargaUsuarioDto` del backend, campo por campo (`main`, PR #24).
 * ASP.NET no distingue mayúsculas al leer el JSON, así que el camelCase
 * entra bien en las propiedades PascalCase.
 */
interface CargaUsuarioApi {
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  email: string;
  genero: string;
  direccion: string;
  telefono: string;
  idProvincia: number;
  /** `DateOnly?`: "YYYY-MM-DD" o null. */
  fechaNac: string | null;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  afiliacionEmergencia: string;
  /**
   * Antes era `idRol: number`. Un `idRol` suelto hoy se ignora y el backend
   * responde 400 "Debe asignar al menos un rol al usuario.".
   */
  idsRoles: number[];
  esDirectorSuplente: boolean;
}

/**
 * `ActualizarPerfilDto` del backend, sin los dos campos que "Mi perfil" no usa
 * (`genero` y `afiliacionEmergencia`: el `GET` no los devuelve, así que no se
 * pueden precargar, y un campo ausente el backend lo deja como estaba).
 *
 * Desde el 17/10/2026 un texto vacío borra el dato y una provincia <= 0 la
 * borra; el correo vacío se ignora. Ver `datosAEnviar`.
 */
interface ActualizarPerfilApi {
  email: string;
  telefono: string;
  telefonoEmergencia: string;
  contactoEmergencia: string;
  direccion: string;
  lugarNacimiento: string;
  idProvincia: number;
}

/** Lo que devuelve `POST /api/Usuarios/foto-perfil` en un 200: la ruta relativa de la foto. */
interface RespuestaFotoApi {
  message?: string;
  url?: string | null;
}

/** Cada fila de `GET /api/Ubicaciones/paises` (`UbicacionController.cs`). */
interface PaisApi {
  idPais: number;
  nombre: string;
}

/** Cada fila de `GET /api/Ubicaciones/paises/{idPais}/provincias`. */
interface ProvinciaApi {
  idProvincia: number;
  nombre: string;
}

/**
 * Cuántos usuarios pedir de una vez. `GET /api/Usuarios` pagina de a 10 por
 * default — con eso el panel del Director mostraría solo los primeros 10.
 * Mientras el instituto tenga menos usuarios que esto, una sola página
 * "grande" alcanza para la "visualización global" que pide ISCGB-PROJECT.md.
 * Si el instituto real supera este número, el listado queda incompleto EN
 * SILENCIO — la solución correcta es paginar en el panel, no subir esto.
 */
const REGISTROS_POR_PAGINA = 500;

/**
 * Usuarios contra la API real.
 *
 * `listar`, `obtener` y `actualizarMiPerfil` pegan contra `UsuariosController`.
 * `crear`, `actualizar`, `darDeBaja` y `reactivar` pegan contra `UsuariosAdminController`:
 * contra un backend sin ese controlador responden 404 sin cuerpo, y se traduce a
 * `MENSAJE_GESTION_NO_DISPONIBLE` en vez de un error genérico.
 */
@Injectable()
export class UsuariosHttpService extends UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioInstitucional[]> {
    const url = `${RUTAS_API.usuarios}?pagina=1&registrosPorPagina=${REGISTROS_POR_PAGINA}`;

    return this.http.get<RespuestaUsuariosApi>(url).pipe(
      map((respuesta) => (respuesta.datos ?? []).map(aUsuarioInstitucional)),
      catchError((error: HttpErrorResponse) => {
        // `GetUsuarios` responde 404 cuando ningún usuario matchea el filtro:
        // es un listado vacío, no un error.
        if (error.status === 404) {
          return of([]);
        }
        return throwError(() => error);
      }),
    );
  }

  obtener(idUsuario: number): Observable<UsuarioDetalle> {
    return this.http.get<UsuarioDetalleApi>(RUTAS_API.usuarioPorId(idUsuario)).pipe(
      map(aUsuarioDetalle),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer el detalle del usuario:', error);
        return throwError(() => error);
      }),
    );
  }

  listarProvincias(): Observable<Provincia[]> {
    return this.http.get<PaisApi[]>(RUTAS_API.paises).pipe(
      switchMap((paises) => {
        // `forkJoin([])` completa sin emitir nada: con una base sin países el
        // desplegable se quedaría "cargando" para siempre.
        if (paises.length === 0) {
          return of([] as Provincia[]);
        }
        return forkJoin(paises.map((pais) => this.provinciasDe(pais))).pipe(
          map((grupos) => grupos.flat()),
        );
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer países y provincias:', error);
        return throwError(() => error);
      }),
    );
  }

  actualizarMiPerfil(datos: MisDatos): Observable<void> {
    // Adapter de salida: viajan todos los campos. Uno vacío borra el dato.
    const cuerpo: ActualizarPerfilApi = datosAEnviar(datos);

    return this.http.put(RUTAS_API.miPerfil, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(mensajeAlActualizarMisDatos(error))),
      ),
    );
  }

  subirFotoPerfil(archivo: File): Observable<string> {
    // El nombre del campo es el de la propiedad de `SubirFotoDto`.
    const cuerpo = new FormData();
    cuerpo.append('Foto', archivo);

    return this.http.post<RespuestaFotoApi>(RUTAS_API.fotoPerfil, cuerpo).pipe(
      map((respuesta) => {
        const url = urlArchivoSubido(respuesta?.url ?? null);
        if (url === null) {
          throw new Error('La respuesta no trae la URL de la foto.');
        }
        return url;
      }),
      catchError((error: unknown) => {
        const delServidor =
          error instanceof HttpErrorResponse && error.status === 400
            ? mensajeDelServidor(error)
            : null;
        if (delServidor === null) {
          console.error('Error al subir la foto de perfil:', error);
        }
        return throwError(() => new Error(delServidor ?? MENSAJE_ERROR_SUBIR_FOTO));
      }),
    );
  }

  /** Las provincias de un país, con el país ya completado. 404 = ninguna. */
  private provinciasDe(pais: PaisApi): Observable<Provincia[]> {
    return this.http.get<ProvinciaApi[]>(RUTAS_API.provinciasDePais(pais.idPais)).pipe(
      map((provincias) =>
        provincias.map((provincia) => ({
          idProvincia: provincia.idProvincia,
          nombre: provincia.nombre,
          pais: pais.nombre,
        })),
      ),
      catchError((error: HttpErrorResponse) => {
        // `GetProvinciasByPais` responde 404 cuando el país no tiene
        // provincias cargadas: es una lista vacía, no un error.
        if (error.status === 404) {
          return of([] as Provincia[]);
        }
        return throwError(() => error);
      }),
    );
  }

  crear(perfil: PerfilUsuario): Observable<string> {
    return this.http
      .post<{ mensaje?: string; legajoAutocompletado?: string }>(
        RUTAS_API.altaUsuario,
        aCargaUsuarioApi(perfil),
      )
      .pipe(
        map((respuesta) => {
          const legajo = respuesta?.legajoAutocompletado?.trim();
          const base = respuesta?.mensaje?.trim() || 'Usuario creado exitosamente.';
          return legajo ? `${base} N.° de legajo: ${legajo}.` : base;
        }),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(traducirError(error, MENSAJE_ERROR_ALTA_USUARIO))),
        ),
      );
  }

  actualizar(idUsuario: number, perfil: PerfilUsuario): Observable<string> {
    return this.http
      .put<{ message?: string }>(RUTAS_API.modificarUsuario(idUsuario), aCargaUsuarioApi(perfil))
      .pipe(
        // El backend responde siempre el mismo texto con "del usuario"; el
        // criterio pide, si se puede, el nombre de la persona (SCRUM-139).
        map(() => mensajePerfilActualizado(`${perfil.nombre} ${perfil.apellido}`)),
        catchError((error: HttpErrorResponse) =>
          throwError(() => new Error(traducirError(error, MENSAJE_ERROR_EDITAR_USUARIO))),
        ),
      );
  }

  darDeBaja(idUsuario: number): Observable<string> {
    return this.http.put<{ message?: string }>(RUTAS_API.bajaUsuario(idUsuario), null).pipe(
      map(
        (respuesta) =>
          respuesta?.message?.trim() || 'El usuario ha sido dado de baja (inactivo) correctamente.',
      ),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(traducirError(error, MENSAJE_ERROR_BAJA_USUARIO))),
      ),
    );
  }

  reactivar(idUsuario: number): Observable<string> {
    return this.http.put<{ message?: string }>(RUTAS_API.reactivarUsuario(idUsuario), null).pipe(
      map(
        (respuesta) =>
          respuesta?.message?.trim() || 'El usuario ha sido reactivado correctamente.',
      ),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new Error(traducirError(error, MENSAJE_ERROR_REACTIVAR_USUARIO))),
      ),
    );
  }
}

/**
 * El mensaje que ve la persona ante un error de gestión de usuarios.
 *
 * El del backend primero: ahí viene "Ya existe un director suplente
 * asignado con el nombre: X", que es exactamente lo que el criterio pide
 * mostrar (SCRUM-138). Si la ruta no existe, se dice eso. Si no, genérico.
 */
function traducirError(error: HttpErrorResponse, porDefecto: string): string {
  if (esEndpointInexistente(error)) {
    return MENSAJE_GESTION_NO_DISPONIBLE;
  }
  const delServidor = mensajeDelServidor(error);
  if (delServidor !== null && error.status >= 400 && error.status < 500) {
    return delServidor;
  }
  console.error('Error en la gestión de usuarios:', error);
  return porDefecto;
}

/**
 * El mensaje que ve la persona si "Mi perfil" no puede guardar.
 *
 * El del backend primero, pero solo si es un rechazo del pedido (4xx): ahí explica
 * qué corregir ("El correo electrónico ingresado ya está registrado a nombre de
 * otra persona."). Un 5xx, la falta de red o una ruta que no existe no le dicen
 * nada útil a quien está en la pantalla: ahí va el genérico, y el detalle a la
 * consola. No pasa por `traducirError`: su texto de "gestión no disponible" habla
 * de otra cosa.
 */
function mensajeAlActualizarMisDatos(error: HttpErrorResponse): string {
  const delServidor = mensajeDelServidor(error);
  if (delServidor !== null && error.status >= 400 && error.status < 500) {
    return delServidor;
  }
  console.error('Error al actualizar los datos del perfil:', error);
  return MENSAJE_ERROR_ACTUALIZAR_MIS_DATOS;
}

function aCargaUsuarioApi(perfil: PerfilUsuario): CargaUsuarioApi {
  return {
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    dni: perfil.dni,
    cuil: perfil.cuil,
    email: perfil.email,
    genero: perfil.genero,
    direccion: perfil.direccion,
    telefono: perfil.telefono,
    idProvincia: perfil.idProvincia,
    fechaNac: perfil.fechaNacimiento === null ? null : aFechaSola(perfil.fechaNacimiento),
    contactoEmergencia: perfil.contactoEmergencia,
    telefonoEmergencia: perfil.telefonoEmergencia,
    afiliacionEmergencia: perfil.afiliacionEmergencia,
    // La lista COMPLETA: al modificar, el backend borra los roles que había y
    // deja solo estos (ver `PerfilUsuario.roles`).
    idsRoles: perfil.roles.map((rol) => ID_ROL[rol]),
    // El backend lo ignora si no hay rol Docente, pero mandarlo en `false`
    // evita que un tilde olvidado viaje de más.
    esDirectorSuplente: perfil.roles.includes(ROLES.docente) && perfil.esDirectorSuplente,
  };
}

function nombresDeRoles(roles: RolApi[] | null): Rol[] {
  return (roles ?? [])
    .map((rol) => rol.nombreRol)
    .filter((nombre): nombre is string => nombre !== null && nombre.trim() !== '') as Rol[];
}

function aUsuarioDetalle(usuario: UsuarioDetalleApi): UsuarioDetalle {
  return {
    idUsuario: usuario.idUsuario,
    dni: usuario.dni ?? '',
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    email: usuario.email ?? '',
    telefono: usuario.telefono,
    telefonoEmergencia: usuario.telefonoEmergencia,
    lugarNacimiento: usuario.lugarNacimiento,
    contactoEmergencia: usuario.contactoEmergencia,
    direccion: usuario.direccion,
    idProvincia: usuario.idProvincia,
    // `desdeFechaSola` y no `new Date(...)`: ver `core/comun/fechas.ts`.
    fechaNac: desdeFechaSola(usuario.fechaNac),
    estadoUsuario: usuario.estadoUsuario,
    roles: nombresDeRoles(usuario.roles),
    rolesConId: usuario.roles ?? [],
  };
}

function aUsuarioInstitucional(usuario: UsuarioApi): UsuarioInstitucional {
  return {
    idUsuario: usuario.idUsuario,
    // El backend concatena dos campos anulables: puede llegar " ".
    nombreCompleto: usuario.nombreCompleto?.trim() || 'Persona sin nombre cargado',
    dni: usuario.dni ?? '',
    email: usuario.email,
    roles: nombresDeRoles(usuario.roles),
    activo: usuario.estadoUsuario,
    // Lo completa el panel con `GET /api/Legajos/resumen-estado`.
    estadoLegajo: null,
  };
}
