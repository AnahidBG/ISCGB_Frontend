import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API, urlArchivoSubido } from '../configuracion/api';
import { AuthHttpService, CLAVE_SESION } from './auth-http.service';
import {
  MENSAJE_ENLACE_INVALIDO,
  MENSAJE_ENLACE_RECUPERACION_INVALIDO,
  MENSAJE_ERROR_CREAR_PASSWORD,
  MENSAJE_ERROR_RECUPERACION,
  MENSAJE_SIN_CONEXION,
} from './auth.service';
import { Sesion } from './modelos/sesion';

describe('AuthHttpService.actualizarCorreo', () => {
  const SESION: Sesion = {
    token: 'token-de-prueba',
    idUsuario: 5,
    nombreCompleto: 'Ana Pérez',
    dni: '12345678',
    email: 'ana@ejemplo.com',
    roles: ['Docente'],
    rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
    venceEl: new Date(Date.now() + 60 * 60 * 1000),
  };

  function crearServicio(): AuthHttpService {
    TestBed.configureTestingModule({
      providers: [AuthHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(AuthHttpService);
  }

  afterEach(() => sessionStorage.removeItem(CLAVE_SESION));

  it('cambia el correo de la sesión abierta y lo deja guardado, con el mismo formato', () => {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(SESION));
    const servicio = crearServicio();

    servicio.actualizarCorreo('nuevo@ejemplo.com');

    expect(servicio.sesion()?.email).toBe('nuevo@ejemplo.com');
    // Lo demás de la sesión queda como estaba, incluido el vencimiento del token.
    expect(servicio.sesion()?.venceEl).toEqual(SESION.venceEl);
    expect(JSON.parse(sessionStorage.getItem(CLAVE_SESION) as string)).toEqual({
      ...SESION,
      email: 'nuevo@ejemplo.com',
      venceEl: SESION.venceEl.toISOString(),
    });
  });

  it('sin sesión abierta no hace nada ni guarda nada', () => {
    const servicio = crearServicio();

    servicio.actualizarCorreo('nuevo@ejemplo.com');

    expect(servicio.sesion()).toBeNull();
    expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('actualizarFoto cambia la foto de la sesión abierta y la deja guardada', () => {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(SESION));
    const servicio = crearServicio();

    servicio.actualizarFoto('http://localhost:5231/uploads/perfiles/nueva.png');

    expect(servicio.sesion()?.fotoUrl).toBe('http://localhost:5231/uploads/perfiles/nueva.png');
    expect(JSON.parse(sessionStorage.getItem(CLAVE_SESION) as string).fotoUrl).toBe(
      'http://localhost:5231/uploads/perfiles/nueva.png',
    );
  });
});

describe('AuthHttpService.iniciarSesion: foto de perfil', () => {
  /** Un JWT legible: solo importa que el contenido traiga un `exp` futuro. */
  const TOKEN = `cabecera.${btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  )}.firma`;

  function respuestaLogin(extra: Record<string, unknown> = {}) {
    return {
      token: TOKEN,
      usuario: 'Ana Pérez',
      estado_usuario: true,
      dni: '12345678',
      telefono: null,
      telefonoEmergencia: null,
      lugar_Nacimiento: null,
      nombreContactoEmergencia: null,
      direccion: null,
      email: 'ana@ejemplo.com',
      idUsuario: 5,
      roles: [{ idRol: 3, nombreRol: 'Docente' }],
      ...extra,
    };
  }

  let servicio: AuthHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuthHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    sessionStorage.removeItem(CLAVE_SESION);
  });

  it('arma la URL completa de la foto que devuelve el login desde el 17/10', () => {
    servicio.iniciarSesion({ dni: '12345678', password: 'x' }).subscribe();

    backend
      .expectOne(RUTAS_API.login)
      .flush(respuestaLogin({ foto: '/uploads/perfiles/usuario_5_abc.jpg' }));

    expect(servicio.sesion()?.fotoUrl).toBe(urlArchivoSubido('/uploads/perfiles/usuario_5_abc.jpg'));
  });

  it.each([
    ['viene en null', { foto: null }],
    ['no viene (un backend anterior)', {}],
  ])('sin foto la sesión queda con `fotoUrl` en null cuando %s', (_caso, extra) => {
    servicio.iniciarSesion({ dni: '12345678', password: 'x' }).subscribe();

    backend.expectOne(RUTAS_API.login).flush(respuestaLogin(extra));

    expect(servicio.sesion()?.fotoUrl).toBeNull();
  });
});

describe('AuthHttpService.establecerPassword', () => {
  let servicio: AuthHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuthHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  /** Dispara la llamada y devuelve lo que pasó: si completó o con qué mensaje falló. */
  function enviar(): { completo: () => boolean; error: () => string | null } {
    let completo = false;
    let error: string | null = null;
    servicio.establecerPassword('tok-123', 'Clave1234').subscribe({
      complete: () => (completo = true),
      error: (fallo: Error) => (error = fallo.message),
    });
    return { completo: () => completo, error: () => error };
  }

  it('hace POST a la URL de establecer-password con el body exacto { token, nuevaPassword }', () => {
    enviar();

    const pedido = backend.expectOne(RUTAS_API.establecerPassword);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ token: 'tok-123', nuevaPassword: 'Clave1234' });
    pedido.flush({ mensaje: 'ok' });
  });

  it('la URL apunta a /api/UsuariosAdmin/establecer-password', () => {
    expect(RUTAS_API.establecerPassword.endsWith('/api/UsuariosAdmin/establecer-password')).toBe(
      true,
    );
    enviar();
    backend.expectOne(RUTAS_API.establecerPassword).flush({});
  });

  it('200 completa sin error', () => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.establecerPassword)
      .flush({ mensaje: 'Contraseña configurada exitosamente. Ya puede iniciar sesión.' });

    expect(resultado.completo()).toBe(true);
    expect(resultado.error()).toBeNull();
  });

  it('400 con body string pelado falla con el mensaje de enlace inválido', () => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.establecerPassword)
      .flush('El enlace ha expirado. Solicite uno nuevo.', { status: 400, statusText: 'Bad Request' });

    expect(resultado.error()).toBe(MENSAJE_ENLACE_INVALIDO);
  });

  it('400 con body { message } falla con el mismo mensaje, sin filtrar el body crudo', () => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.establecerPassword)
      .flush({ message: 'detalle interno del servidor' }, { status: 400, statusText: 'Bad Request' });

    expect(resultado.error()).toBe(MENSAJE_ENLACE_INVALIDO);
    expect(resultado.error()).not.toContain('detalle interno');
  });

  it('400 con ProblemDetails falla con el mismo mensaje, sin filtrar el body crudo', () => {
    const resultado = enviar();

    backend.expectOne(RUTAS_API.establecerPassword).flush(
      { title: 'One or more validation errors occurred.', status: 400, errors: { Token: ['x'] } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(resultado.error()).toBe(MENSAJE_ENLACE_INVALIDO);
    expect(resultado.error()).not.toContain('validation');
  });

  it('status 0 falla con MENSAJE_SIN_CONEXION', () => {
    const resultado = enviar();

    backend.expectOne(RUTAS_API.establecerPassword).error(new ProgressEvent('error'));

    expect(resultado.error()).toBe(MENSAJE_SIN_CONEXION);
  });

  it('500 falla con el mensaje genérico, no con el de enlace ni el de conexión', () => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.establecerPassword)
      .flush('stack trace', { status: 500, statusText: 'Server Error' });

    expect(resultado.error()).toBe(MENSAJE_ERROR_CREAR_PASSWORD);
    expect(resultado.error()).not.toBe(MENSAJE_ENLACE_INVALIDO);
    expect(resultado.error()).not.toBe(MENSAJE_SIN_CONEXION);
  });
});

describe('AuthHttpService.solicitarRecuperacion', () => {
  let servicio: AuthHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuthHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  /** Dispara la llamada y devuelve lo que pasó: si completó o con qué mensaje falló. */
  function pedir(): { completo: () => boolean; error: () => string | null } {
    let completo = false;
    let error: string | null = null;
    servicio.solicitarRecuperacion('12345678').subscribe({
      complete: () => (completo = true),
      error: (fallo: Error) => (error = fallo.message),
    });
    return { completo: () => completo, error: () => error };
  }

  it('hace POST a /api/Auth/recuperar-contrasena con el body exacto { dni }', () => {
    expect(RUTAS_API.recuperarContrasena.endsWith('/api/Auth/recuperar-contrasena')).toBe(true);
    pedir();

    const pedido = backend.expectOne(RUTAS_API.recuperarContrasena);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ dni: '12345678' });
    pedido.flush({ message: 'ok' });
  });

  it('200 completa sin error: es la misma respuesta exista o no el DNI', () => {
    const resultado = pedir();

    backend.expectOne(RUTAS_API.recuperarContrasena).flush({
      message: 'Si el DNI existe en el sistema, se enviará un correo con instrucciones.',
    });

    expect(resultado.completo()).toBe(true);
    expect(resultado.error()).toBeNull();
  });

  it('status 0 falla con MENSAJE_SIN_CONEXION', () => {
    const resultado = pedir();

    backend.expectOne(RUTAS_API.recuperarContrasena).error(new ProgressEvent('error'));

    expect(resultado.error()).toBe(MENSAJE_SIN_CONEXION);
  });

  it('500 (falló el correo) falla con el mensaje genérico, sin filtrar el detalle', () => {
    const resultado = pedir();

    backend
      .expectOne(RUTAS_API.recuperarContrasena)
      .flush(
        { message: 'Error al intentar enviar el correo de recuperación.', error: 'SMTP 535' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(resultado.error()).toBe(MENSAJE_ERROR_RECUPERACION);
    expect(resultado.error()).not.toContain('SMTP');
  });

  it('400 (DNI vacío) también falla con el mensaje genérico', () => {
    const resultado = pedir();

    backend
      .expectOne(RUTAS_API.recuperarContrasena)
      .flush({ message: 'El DNI es obligatorio.' }, { status: 400, statusText: 'Bad Request' });

    expect(resultado.error()).toBe(MENSAJE_ERROR_RECUPERACION);
  });
});

describe('AuthHttpService.restablecerPassword', () => {
  let servicio: AuthHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AuthHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function enviar(): { completo: () => boolean; error: () => string | null } {
    let completo = false;
    let error: string | null = null;
    servicio.restablecerPassword('tok-123', 'Clave1234').subscribe({
      complete: () => (completo = true),
      error: (fallo: Error) => (error = fallo.message),
    });
    return { completo: () => completo, error: () => error };
  }

  it('hace POST a /api/Auth/establecer-password (no al de UsuariosAdmin) con { token, nuevaPassword }', () => {
    expect(RUTAS_API.restablecerPassword.endsWith('/api/Auth/establecer-password')).toBe(true);
    expect(RUTAS_API.restablecerPassword).not.toBe(RUTAS_API.establecerPassword);
    enviar();

    const pedido = backend.expectOne(RUTAS_API.restablecerPassword);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ token: 'tok-123', nuevaPassword: 'Clave1234' });
    pedido.flush({ message: 'Contraseña configurada exitosamente. Ya puede iniciar sesión.' });
  });

  it('200 completa sin error', () => {
    const resultado = enviar();

    backend.expectOne(RUTAS_API.restablecerPassword).flush({ message: 'ok' });

    expect(resultado.completo()).toBe(true);
    expect(resultado.error()).toBeNull();
  });

  it.each([
    ['inválido', { message: 'El enlace es inválido.' }],
    ['vencido', { message: 'El enlace ha expirado. Solicite uno nuevo.' }],
  ])('400 por enlace %s falla con el mensaje de recuperación, sin el body crudo', (_caso, body) => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.restablecerPassword)
      .flush(body, { status: 400, statusText: 'Bad Request' });

    expect(resultado.error()).toBe(MENSAJE_ENLACE_RECUPERACION_INVALIDO);
    expect(resultado.error()).not.toBe(MENSAJE_ENLACE_INVALIDO);
  });

  it('status 0 falla con MENSAJE_SIN_CONEXION', () => {
    const resultado = enviar();

    backend.expectOne(RUTAS_API.restablecerPassword).error(new ProgressEvent('error'));

    expect(resultado.error()).toBe(MENSAJE_SIN_CONEXION);
  });

  it('500 falla con el mensaje genérico de guardado', () => {
    const resultado = enviar();

    backend
      .expectOne(RUTAS_API.restablecerPassword)
      .flush('stack trace', { status: 500, statusText: 'Server Error' });

    expect(resultado.error()).toBe(MENSAJE_ERROR_CREAR_PASSWORD);
  });
});
