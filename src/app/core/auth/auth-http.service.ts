import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import {
  AuthService,
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_SIN_CONEXION,
} from './auth.service';
import { fechaDeVencimiento, leerPayloadJwt } from './jwt';
import { CredencialesLogin } from './modelos/credenciales-login';
import { RespuestaLogin } from './modelos/respuesta-login';
import { Sesion } from './modelos/sesion';

const CLAVE_SESION = 'iscgb.sesion';

/**
 * Autenticación real contra la API de ISCGB.
 *
 * Su único trabajo extra es TRADUCIR: la API devuelve campos con nombres
 * inconsistentes y los roles repartidos entre el cuerpo y el token. Acá se
 * ordena todo eso una sola vez y se entrega una `Sesion` limpia.
 */
@Injectable()
export class AuthHttpService extends AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesionActual = signal<Sesion | null>(leerSesionGuardada());

  readonly sesion = this.sesionActual.asReadonly();
  readonly estaAutenticado = computed(() => this.sesionActual() !== null);

  iniciarSesion(credenciales: CredencialesLogin): Observable<Sesion> {
    return this.http.post<RespuestaLogin>(RUTAS_API.login, credenciales).pipe(
      map((respuesta) => this.aSesion(respuesta)),
      map((sesion) => {
        this.guardar(sesion);
        return sesion;
      }),
      catchError((error: HttpErrorResponse) => {
        // 401 = credenciales incorrectas. Cualquier otra cosa (0, 500, timeout)
        // es un problema de conexión o del servidor, y no es culpa del usuario.
        const mensaje =
          error.status === 401 ? MENSAJE_CREDENCIALES_INVALIDAS : MENSAJE_SIN_CONEXION;
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  cerrarSesion(): void {
    this.sesionActual.set(null);
    sessionStorage.removeItem(CLAVE_SESION);
  }

  /** Junta el body de la respuesta con lo que viene adentro del token. */
  private aSesion(respuesta: RespuestaLogin): Sesion {
    const payload = leerPayloadJwt(respuesta.token);
    if (payload === null) {
      throw new Error(MENSAJE_SIN_CONEXION);
    }

    return {
      token: respuesta.token,
      idUsuario: respuesta.idUsuario,
      // El backend concatena nombre y apellido; si están vacíos llega " ".
      nombreCompleto: respuesta.usuario.trim(),
      dni: respuesta.dni,
      email: respuesta.email,
      roles: rolesDe(respuesta),
      venceEl: fechaDeVencimiento(payload),
    };
  }

  private guardar(sesion: Sesion): void {
    this.sesionActual.set(sesion);
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }
}

/**
 * Saca los nombres de los roles de la respuesta del login.
 *
 * La fuente es `roles` del cuerpo, no el token: viene con id y nombre, y no
 * hay que decodificar nada. Se descartan los nombres nulos, porque un rol sin
 * nombre no sirve para decidir a dónde mandar a la persona.
 *
 * Si `roles` llegara vacío o ausente —un backend viejo, una respuesta
 * recortada— la sesión queda sin roles y los `roleGuard` no la dejan entrar
 * a ningún lado protegido. Es el comportamiento correcto: ante la duda, no
 * se abre la puerta.
 */
function rolesDe(respuesta: RespuestaLogin): string[] {
  return (respuesta.roles ?? [])
    .map((rol) => rol.nombreRol)
    .filter((nombre): nombre is string => nombre !== null && nombre.trim() !== '');
}

/**
 * Recupera la sesión al recargar la página.
 *
 * Usamos `sessionStorage` y no `localStorage` a propósito: la sesión muere
 * al cerrar la pestaña. En computadoras compartidas (secretaría, sala de
 * profesores) eso evita que el próximo que se siente entre con la sesión
 * del anterior.
 */
function leerSesionGuardada(): Sesion | null {
  const guardado = sessionStorage.getItem(CLAVE_SESION);
  if (guardado === null) {
    return null;
  }

  try {
    const sesion = JSON.parse(guardado) as Sesion;
    const venceEl = new Date(sesion.venceEl);

    if (venceEl.getTime() <= Date.now()) {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }

    // Una sesión guardada antes de este cambio no tiene `roles`. Sin esto,
    // `tieneAlgunRol` reventaría al recorrer un arreglo inexistente.
    return { ...sesion, roles: sesion.roles ?? [], venceEl };
  } catch {
    sessionStorage.removeItem(CLAVE_SESION);
    return null;
  }
}
