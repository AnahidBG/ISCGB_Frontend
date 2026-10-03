import { Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CredencialesLogin } from './modelos/credenciales-login';
import { Sesion } from './modelos/sesion';

/** Un `AuthService` que no toca la red: la sesión se pone a mano en cada test. */
@Injectable()
class AuthDePrueba extends AuthService {
  readonly sesionActual = signal<Sesion | null>(null);
  readonly sesion = this.sesionActual.asReadonly();
  readonly estaAutenticado = computed(() => this.sesionActual() !== null);

  iniciarSesion(_credenciales: CredencialesLogin): Observable<Sesion> {
    return of(this.sesionActual()!);
  }

  establecerPassword(): Observable<void> {
    return of(undefined);
  }

  cerrarSesion(): void {
    this.sesionActual.set(null);
  }
}

function sesionQueVenceEn(milisegundos: number): Sesion {
  return {
    token: 'token',
    idUsuario: 1,
    nombreCompleto: 'Milena Previgliano',
    dni: '43880335',
    email: 'milena@iscgb.edu.ar',
    roles: ['Docente'],
    venceEl: new Date(Date.now() + milisegundos),
  };
}

function ejecutarGuard(): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as boolean | UrlTree,
  );
}

describe('authGuard', () => {
  let auth: AuthDePrueba;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useClass: AuthDePrueba }],
    });
    auth = TestBed.inject(AuthService) as AuthDePrueba;
    router = TestBed.inject(Router);
  });

  it('sin sesión manda al login', () => {
    const resultado = ejecutarGuard();
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('con sesión vigente deja pasar', () => {
    auth.sesionActual.set(sesionQueVenceEn(60_000));
    expect(ejecutarGuard()).toBe(true);
  });

  it('con el token vencido cierra la sesión y avisa en el login', () => {
    auth.sesionActual.set(sesionQueVenceEn(-1));

    const resultado = ejecutarGuard();

    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login?sesionVencida=1');
    expect(auth.sesion()).toBeNull();
  });
});
