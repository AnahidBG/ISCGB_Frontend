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
import { AuthService } from './auth.service';
import { CredencialesLogin } from './modelos/credenciales-login';
import { ROLES } from './modelos/rol';
import { Sesion } from './modelos/sesion';
import { roleGuard } from './role.guard';

@Injectable()
class AuthDePrueba extends AuthService {
  readonly sesionActual = signal<Sesion | null>(null);
  readonly sesion = this.sesionActual.asReadonly();
  readonly estaAutenticado = computed(() => this.sesionActual() !== null);

  iniciarSesion(_credenciales: CredencialesLogin): Observable<Sesion> {
    return of(this.sesionActual()!);
  }

  cerrarSesion(): void {
    this.sesionActual.set(null);
  }
}

function sesionCon(roles: string[]): Sesion {
  return {
    token: 'token',
    idUsuario: 7,
    nombreCompleto: 'Persona de Prueba',
    dni: '40555111',
    email: 'prueba@iscgb.edu.ar',
    roles,
    venceEl: new Date(Date.now() + 60_000),
  };
}

function ejecutar(...permitidos: string[]): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () =>
      roleGuard(...permitidos)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as
        boolean | UrlTree,
  );
}

describe('roleGuard', () => {
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
    const resultado = ejecutar(ROLES.director);
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('deja pasar con alguno de los roles permitidos', () => {
    auth.sesionActual.set(sesionCon([ROLES.secretario]));
    expect(ejecutar(ROLES.secretario, ROLES.director)).toBe(true);
  });

  it('con más de un rol alcanza con que UNO esté permitido', () => {
    auth.sesionActual.set(sesionCon([ROLES.director, ROLES.docente]));
    expect(ejecutar(ROLES.docente)).toBe(true);
  });

  it('con otro rol vuelve a SU panel con el aviso de acceso denegado', () => {
    auth.sesionActual.set(sesionCon([ROLES.alumno]));

    const resultado = ejecutar(ROLES.director);

    expect(router.serializeUrl(resultado as UrlTree)).toBe('/alumno/panel?accesoDenegado=1');
  });

  it('sin ningún rol rebota a /inicio (que no tiene roleGuard, así no hay bucle)', () => {
    auth.sesionActual.set(sesionCon([]));

    const resultado = ejecutar(ROLES.docente);

    expect(router.serializeUrl(resultado as UrlTree)).toBe('/inicio?accesoDenegado=1');
  });

  it('no existe un rol Preceptor: una sesión con ese nombre no entra a pantallas de Secretario', () => {
    auth.sesionActual.set(sesionCon(['Preceptor']));

    const resultado = ejecutar(ROLES.secretario);

    expect(resultado).not.toBe(true);
  });
});
