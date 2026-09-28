import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import { AuthService } from './auth.service';
import { CredencialesLogin } from './modelos/credenciales-login';
import { Sesion } from './modelos/sesion';
import { sesionInterceptor } from './sesion.interceptor';

@Injectable()
class AuthDePrueba extends AuthService {
  readonly sesionActual = signal<Sesion | null>({
    token: 'token',
    idUsuario: 3,
    nombreCompleto: 'Anahid Giaquinta',
    dni: '40555111',
    email: 'anahid@iscgb.edu.ar',
    roles: ['Alumno'],
    venceEl: new Date(Date.now() + 60_000),
  });
  readonly sesion = this.sesionActual.asReadonly();
  readonly estaAutenticado = computed(() => this.sesionActual() !== null);

  iniciarSesion(_credenciales: CredencialesLogin): Observable<Sesion> {
    return of(this.sesionActual()!);
  }

  cerrarSesion(): void {
    this.sesionActual.set(null);
  }
}

describe('sesionInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthDePrueba;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: AuthDePrueba },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as AuthDePrueba;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  it('un 401 de la API cierra la sesión y manda al login avisando', () => {
    http.get(RUTAS_API.usuarios).subscribe({ error: () => undefined });
    backend.expectOne(RUTAS_API.usuarios).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.sesion()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { sesionVencida: 1 },
    });
  });

  it('un 401 del propio login NO cierra nada: es "DNI o contraseña incorrectos"', () => {
    http.post(RUTAS_API.login, {}).subscribe({ error: () => undefined });
    backend.expectOne(RUTAS_API.login).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.sesion()).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 403 vuelve al panel propio con el aviso de acceso denegado', () => {
    http.get(RUTAS_API.usuarios).subscribe({ error: () => undefined });
    backend.expectOne(RUTAS_API.usuarios).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(auth.sesion()).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/alumno/panel'], {
      queryParams: { accesoDenegado: 1 },
    });
  });

  it('re-lanza el error para que la pantalla apague su "cargando"', () => {
    let recibio = false;
    http.get(RUTAS_API.usuarios).subscribe({ error: () => (recibio = true) });
    backend.expectOne(RUTAS_API.usuarios).flush(null, { status: 500, statusText: 'Error' });

    expect(recibio).toBe(true);
  });
});
