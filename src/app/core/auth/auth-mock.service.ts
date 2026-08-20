import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthService, MENSAJE_CREDENCIALES_INVALIDAS } from './auth.service';
import { CredencialesLogin } from './modelos/credenciales-login';
import { Sesion } from './modelos/sesion';

/** Cuánto tarda el login falso, para ver el estado "cargando" del botón. */
const DEMORA_SIMULADA_MS = 800;

/**
 * Usuarios de mentira para desarrollar sin backend.
 *
 * Los `idRol` salen del token real que devuelve la API. Todavía no sabemos
 * qué rol es cada número — falta que backend nos pase la equivalencia.
 */
const USUARIOS_DE_PRUEBA = [
  { dni: '43880335', password: 'Test1234', nombre: 'Milena Previgliano', idRol: '1' },
  { dni: '43120234', password: 'Test1234', nombre: 'Angel Silva', idRol: '2' },
  { dni: '40555111', password: 'Test1234', nombre: 'Anahid Giaquinta', idRol: '3' },
] as const;

/**
 * Autenticación simulada.
 *
 * No toca la red: valida contra la lista de arriba y devuelve una sesión
 * armada a mano. Sirve para maquetar, para probar los estados de error y
 * para que el login siga andando los días que el backend no está levantado.
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

    const venceEl = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas, igual que el real
    const sesion: Sesion = {
      token: construirTokenFalso(usuario.dni, usuario.idRol, venceEl),
      idUsuario: USUARIOS_DE_PRUEBA.indexOf(usuario) + 1,
      nombreCompleto: usuario.nombre,
      dni: usuario.dni,
      email: `${usuario.dni}@iscgb.edu.ar`,
      idRol: usuario.idRol,
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
 * Sirve para que el resto del frontend (que lee el token para saber el rol)
 * funcione igual con mock que con backend real. Ningún servidor lo aceptaría,
 * y está bien: nunca sale de esta máquina.
 */
function construirTokenFalso(dni: string, idRol: string, venceEl: Date): string {
  const enBase64Url = (objeto: object) =>
    btoa(JSON.stringify(objeto)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const ahoraEnSegundos = Math.floor(Date.now() / 1000);

  const cabecera = { alg: 'HS256', typ: 'JWT' };
  const contenido = {
    nameid: '1',
    DNI: dni,
    role: idRol,
    nbf: ahoraEnSegundos,
    exp: Math.floor(venceEl.getTime() / 1000),
    iat: ahoraEnSegundos,
  };

  return `${enBase64Url(cabecera)}.${enBase64Url(contenido)}.firma-de-mentira`;
}
