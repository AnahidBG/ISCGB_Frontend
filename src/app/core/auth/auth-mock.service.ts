import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthService, MENSAJE_CREDENCIALES_INVALIDAS } from './auth.service';
import { CredencialesLogin } from './modelos/credenciales-login';
import { Sesion } from './modelos/sesion';
import { USUARIOS_DE_PRUEBA } from './usuarios-de-prueba';

/** Cuánto tarda el login falso, para ver el estado "cargando" del botón. */
const DEMORA_SIMULADA_MS = 800;

/** Los tokens del backend duran 2 horas. El mock imita eso. */
const DURACION_SESION_MS = 2 * 60 * 60 * 1000;

/**
 * Autenticación simulada.
 *
 * No toca la red: valida contra `usuarios-de-prueba.ts` y devuelve una
 * sesión armada a mano. Sirve para maquetar, para probar los estados de
 * error, para verificar los `roleGuard` con todos los roles, y para que el
 * login siga andando los días que el backend no está levantado.
 *
 * Para agregar o cambiar usuarios NO se toca este archivo: se edita la lista
 * en `usuarios-de-prueba.ts`.
 *
 * Se cambia por `AuthHttpService` con una línea en `app.config.ts`.
 */
@Injectable()
export class AuthMockService extends AuthService {
  private readonly sesionActual = signal<Sesion | null>(null);

  readonly sesion = this.sesionActual.asReadonly();
  readonly estaAutenticado = computed(() => this.sesionActual() !== null);

  iniciarSesion(credenciales: CredencialesLogin): Observable<Sesion> {
    const usuario = USUARIOS_DE_PRUEBA.find(
      (candidato) =>
        candidato.dni === credenciales.dni && candidato.password === credenciales.password,
    );

    if (usuario === undefined) {
      return throwError(() => new Error(MENSAJE_CREDENCIALES_INVALIDAS)).pipe(
        delay(DEMORA_SIMULADA_MS),
      );
    }

    const venceEl = new Date(Date.now() + DURACION_SESION_MS);
    const roles = [...usuario.roles];

    const sesion: Sesion = {
      token: construirTokenFalso(usuario.dni, roles, venceEl),
      idUsuario: USUARIOS_DE_PRUEBA.indexOf(usuario) + 1,
      nombreCompleto: usuario.nombre,
      dni: usuario.dni,
      email: `${usuario.dni}@iscgb.edu.ar`,
      roles,
      venceEl,
    };

    this.sesionActual.set(sesion);
    return of(sesion).pipe(delay(DEMORA_SIMULADA_MS));
  }

  cerrarSesion(): void {
    this.sesionActual.set(null);
  }
}

/**
 * Arma un JWT con la misma forma que el real, pero con la firma inventada.
 *
 * Imita hasta el detalle raro del backend: con un solo rol, `role` es texto;
 * con varios, es un arreglo. Si el mock mandara siempre un arreglo, el día
 * que algo lea mal ese campo el error aparecería recién contra la API real.
 *
 * Ningún servidor aceptaría este token, y está bien: nunca sale de esta
 * máquina.
 */
function construirTokenFalso(dni: string, roles: string[], venceEl: Date): string {
  const enBase64Url = (objeto: object) =>
    btoa(JSON.stringify(objeto)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const ahoraEnSegundos = Math.floor(Date.now() / 1000);

  const cabecera = { alg: 'HS256', typ: 'JWT' };
  const contenido = {
    nameid: '1',
    DNI: dni,
    role: roles.length === 1 ? roles[0] : roles,
    nbf: ahoraEnSegundos,
    exp: Math.floor(venceEl.getTime() / 1000),
    iat: ahoraEnSegundos,
  };

  return `${enBase64Url(cabecera)}.${enBase64Url(contenido)}.firma-de-mentira`;
}
