import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API, urlArchivoSubido } from '../configuracion/api';
import { MisDatos } from './modelos/mis-datos';
import { PerfilUsuario } from './modelos/perfil-usuario';
import { UsuariosHttpService } from './usuarios-http.service';
import {
  MENSAJE_ERROR_ACTUALIZAR_MIS_DATOS,
  MENSAJE_ERROR_SUBIR_FOTO,
  MENSAJE_GESTION_NO_DISPONIBLE,
} from './usuarios.service';

const PERFIL: PerfilUsuario = {
  nombre: 'María',
  apellido: 'Gómez',
  dni: '12345678',
  cuil: '27123456780',
  email: 'maria@ejemplo.com',
  genero: 'Femenino',
  direccion: 'Av. Siempreviva 742',
  telefono: '3511234567',
  idProvincia: 6,
  fechaNacimiento: new Date(1990, 4, 14),
  contactoEmergencia: 'Juan Gómez',
  telefonoEmergencia: '3517654321',
  afiliacionEmergencia: 'APROSS',
  roles: ['Docente'],
  esDirectorSuplente: true,
};

describe('UsuariosHttpService', () => {
  let servicio: UsuariosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsuariosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UsuariosHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('el alta manda CargaUsuarioDto con los ids de los roles y la fecha sin hora', () => {
    let mensaje = '';
    servicio.crear(PERFIL).subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.altaUsuario);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      nombre: 'María',
      apellido: 'Gómez',
      dni: '12345678',
      cuil: '27123456780',
      email: 'maria@ejemplo.com',
      genero: 'Femenino',
      direccion: 'Av. Siempreviva 742',
      telefono: '3511234567',
      idProvincia: 6,
      fechaNac: '1990-05-14',
      contactoEmergencia: 'Juan Gómez',
      telefonoEmergencia: '3517654321',
      afiliacionEmergencia: 'APROSS',
      idsRoles: [3],
      esDirectorSuplente: true,
    });

    pedido.flush({ mensaje: 'Usuario creado exitosamente.', legajoAutocompletado: '12345678' });
    expect(mensaje).toBe('Usuario creado exitosamente. N.° de legajo: 12345678.');
  });

  it('director suplente solo viaja en true para Docentes', () => {
    servicio.crear({ ...PERFIL, roles: ['Alumno'] }).subscribe();

    const pedido = backend.expectOne(RUTAS_API.altaUsuario);
    expect(pedido.request.body.esDirectorSuplente).toBe(false);
    expect(pedido.request.body.idsRoles).toEqual([4]);
    pedido.flush({});
  });

  it('con varios roles manda todos los ids, y el suplente vale si uno es Docente', () => {
    servicio.crear({ ...PERFIL, roles: ['Director', 'Docente'] }).subscribe();

    const pedido = backend.expectOne(RUTAS_API.altaUsuario);
    expect(pedido.request.body.idsRoles).toEqual([1, 3]);
    expect(pedido.request.body.esDirectorSuplente).toBe(true);
    expect(pedido.request.body.idRol).toBeUndefined();
    pedido.flush({});
  });

  it('la modificación manda la lista completa de roles: el backend reemplaza los que había', () => {
    servicio.actualizar(9, { ...PERFIL, roles: ['Secretario', 'Docente'] }).subscribe();

    const pedido = backend.expectOne(RUTAS_API.modificarUsuario(9));
    expect(pedido.request.body.idsRoles).toEqual([2, 3]);
    pedido.flush({ message: 'ok' });
  });

  it('muestra el mensaje del backend cuando ya hay un director suplente', () => {
    let error = '';
    servicio.crear(PERFIL).subscribe({ error: (e: Error) => (error = e.message) });

    backend
      .expectOne(RUTAS_API.altaUsuario)
      .flush('Ya existe un director suplente asignado con el nombre: Ana Pérez.', {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(error).toBe('Ya existe un director suplente asignado con el nombre: Ana Pérez.');
  });

  it('un 404 sin cuerpo quiere decir que el backend no publicó UsuariosAdmin', () => {
    let error = '';
    servicio.crear(PERFIL).subscribe({ error: (e: Error) => (error = e.message) });

    backend.expectOne(RUTAS_API.altaUsuario).flush(null, { status: 404, statusText: 'Not Found' });

    expect(error).toBe(MENSAJE_GESTION_NO_DISPONIBLE);
  });

  it('la modificación confirma con el nombre de la persona', () => {
    let mensaje = '';
    servicio.actualizar(9, PERFIL).subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.modificarUsuario(9));
    expect(pedido.request.method).toBe('PUT');
    pedido.flush({ message: 'El perfil del usuario ha sido actualizado correctamente' });

    expect(mensaje).toBe('El perfil de María Gómez ha sido actualizado correctamente.');
  });

  it('la baja es un PUT sin cuerpo', () => {
    servicio.darDeBaja(9).subscribe();

    const pedido = backend.expectOne(RUTAS_API.bajaUsuario(9));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toBeNull();
    pedido.flush({ message: 'ok' });
  });

  it('la reactivación es un PUT sin cuerpo', () => {
    servicio.reactivar(9).subscribe();

    const pedido = backend.expectOne(RUTAS_API.reactivarUsuario(9));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toBeNull();
    pedido.flush({ message: 'El usuario fue reactivado.' });
  });

  it('el detalle lee la fecha de nacimiento en hora local (no un día antes)', () => {
    let dia = 0;
    servicio.obtener(9).subscribe((usuario) => (dia = usuario.fechaNac!.getDate()));

    backend.expectOne(RUTAS_API.usuarioPorId(9)).flush({
      idUsuario: 9,
      dni: '12345678',
      nombre: 'María',
      apellido: 'Gómez',
      email: 'maria@ejemplo.com',
      telefono: null,
      telefonoEmergencia: null,
      lugarNacimiento: null,
      contactoEmergencia: null,
      direccion: null,
      idProvincia: null,
      fechaNac: '1990-05-14',
      estadoUsuario: true,
      roles: [{ idRol: 3, nombreRol: 'Docente' }],
    });

    expect(dia).toBe(14);
  });

  it('el listado trae el estado de la cuenta', () => {
    let activo: boolean | undefined;
    servicio.listar().subscribe((lista) => (activo = lista[0].activo));

    backend
      .expectOne((pedido) => pedido.url.startsWith(RUTAS_API.usuarios))
      .flush({
        paginacion: {
          totalRegistros: 1,
          totalPaginas: 1,
          paginaActual: 1,
          registrosPorPagina: 500,
        },
        datos: [
          {
            idUsuario: 1,
            dni: '1',
            nombreCompleto: 'A B',
            email: null,
            telefono: null,
            estadoUsuario: false,
            roles: [],
          },
        ],
      });

    expect(activo).toBe(false);
  });
});

describe('UsuariosHttpService.actualizarMiPerfil', () => {
  let servicio: UsuariosHttpService;
  let backend: HttpTestingController;

  const DATOS: MisDatos = {
    email: 'maria@ejemplo.com',
    telefono: '3511234567',
    telefonoEmergencia: '3517654321',
    contactoEmergencia: 'Juan Gómez',
    direccion: 'Av. Siempreviva 742',
    lugarNacimiento: 'Villa Dolores',
    idProvincia: 6,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsuariosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UsuariosHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  /** Dispara el guardado y devuelve cómo terminó. */
  function guardar(datos: MisDatos): { completo: () => boolean; error: () => string | null } {
    let completo = false;
    let error: string | null = null;
    servicio.actualizarMiPerfil(datos).subscribe({
      complete: () => (completo = true),
      error: (fallo: Error) => (error = fallo.message),
    });
    return { completo: () => completo, error: () => error };
  }

  it('hace PUT a mi-perfil con todos los campos, sin espacios de más y los vacíos vacíos', () => {
    const resultado = guardar({
      ...DATOS,
      email: ' maria@ejemplo.com ',
      telefonoEmergencia: '',
      direccion: '   ',
      idProvincia: null,
    });

    const pedido = backend.expectOne(RUTAS_API.miPerfil);
    expect(pedido.request.method).toBe('PUT');
    // El backend borra lo que llega vacío ("" → null) y la provincia con id 0.
    expect(pedido.request.body).toStrictEqual({
      email: 'maria@ejemplo.com',
      telefono: '3511234567',
      telefonoEmergencia: '',
      contactoEmergencia: 'Juan Gómez',
      direccion: '',
      lugarNacimiento: 'Villa Dolores',
      idProvincia: 0,
    });

    pedido.flush({ message: 'Datos del perfil actualizados correctamente.' });
    expect(resultado.completo()).toBe(true);
    expect(resultado.error()).toBeNull();
  });

  it('manda la provincia elegida', () => {
    guardar(DATOS);

    const pedido = backend.expectOne(RUTAS_API.miPerfil);
    expect(pedido.request.body.idProvincia).toBe(6);
    pedido.flush({ message: 'ok' });
  });

  it('un 400 con message le muestra ese texto a la persona', () => {
    const resultado = guardar(DATOS);

    backend.expectOne(RUTAS_API.miPerfil).flush(
      {
        message: 'El correo electrónico ingresado ya está registrado a nombre de otra persona.',
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(resultado.error()).toBe(
      'El correo electrónico ingresado ya está registrado a nombre de otra persona.',
    );
  });

  it('un 500 muestra el mensaje genérico, sin el detalle del servidor', () => {
    const resultado = guardar(DATOS);

    backend
      .expectOne(RUTAS_API.miPerfil)
      .flush({ message: 'detalle interno' }, { status: 500, statusText: 'Server Error' });

    expect(resultado.error()).toBe(MENSAJE_ERROR_ACTUALIZAR_MIS_DATOS);
  });
});

describe('UsuariosHttpService.subirFotoPerfil', () => {
  let servicio: UsuariosHttpService;
  let backend: HttpTestingController;
  const FOTO = new File([new Uint8Array(10)], 'yo.png', { type: 'image/png' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsuariosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UsuariosHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('manda la foto como multipart en el campo `Foto` y devuelve la URL completa', () => {
    let url: string | undefined;
    servicio.subirFotoPerfil(FOTO).subscribe((valor) => (url = valor));

    const pedido = backend.expectOne(RUTAS_API.fotoPerfil);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.url).toContain('/api/Usuarios/foto-perfil');
    expect((pedido.request.body as FormData).get('Foto')).toBe(FOTO);
    pedido.flush({
      message: 'Foto de perfil actualizada exitosamente.',
      url: '/uploads/perfiles/usuario_5_abc.png',
    });

    expect(url).toBe(urlArchivoSubido('/uploads/perfiles/usuario_5_abc.png'));
  });

  it('un 400 muestra el mensaje del backend', () => {
    let mensaje: string | undefined;
    servicio.subirFotoPerfil(FOTO).subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.fotoPerfil)
      .flush(
        { message: 'Formato no válido. Solo se permiten JPG y PNG.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('Formato no válido. Solo se permiten JPG y PNG.');
  });

  it.each([
    ['el servidor falla', () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } })],
    ['la respuesta no trae la URL', () => ({ cuerpo: { message: 'ok' }, opciones: {} })],
  ])('da el mensaje genérico cuando %s', (_caso, respuesta) => {
    let mensaje: string | undefined;
    servicio.subirFotoPerfil(FOTO).subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    const { cuerpo, opciones } = respuesta();
    backend.expectOne(RUTAS_API.fotoPerfil).flush(cuerpo, opciones);

    expect(mensaje).toBe(MENSAJE_ERROR_SUBIR_FOTO);
  });
});

describe('UsuariosHttpService.listarProvincias', () => {
  let servicio: UsuariosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsuariosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(UsuariosHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  // `forkJoin` cancela los pedidos pendientes cuando uno de ellos falla.
  afterEach(() => backend.verify({ ignoreCancelled: true }));

  const PAISES = [
    { idPais: 7, nombre: 'Argentina' },
    { idPais: 9, nombre: 'Uruguay' },
  ];

  it('pide los países y las provincias de cada uno, y las devuelve aplanadas con el país', () => {
    let resultado: unknown = null;
    servicio.listarProvincias().subscribe((r) => (resultado = r));

    backend.expectOne(RUTAS_API.paises).flush(PAISES);
    backend
      .expectOne(RUTAS_API.provinciasDePais(7))
      .flush([{ idProvincia: 31, nombre: 'Córdoba' }]);
    backend
      .expectOne(RUTAS_API.provinciasDePais(9))
      .flush([{ idProvincia: 55, nombre: 'Colonia' }]);

    expect(resultado).toEqual([
      { idProvincia: 31, nombre: 'Córdoba', pais: 'Argentina' },
      { idProvincia: 55, nombre: 'Colonia', pais: 'Uruguay' },
    ]);
  });

  it('un país que responde 404 aporta cero provincias y no hace fallar al resto', () => {
    let resultado: unknown = null;
    let fallo = false;
    servicio.listarProvincias().subscribe({
      next: (r) => (resultado = r),
      error: () => (fallo = true),
    });

    backend.expectOne(RUTAS_API.paises).flush(PAISES);
    backend
      .expectOne(RUTAS_API.provinciasDePais(7))
      .flush({ message: 'No se encontraron provincias para este país.' }, { status: 404, statusText: 'Not Found' });
    backend
      .expectOne(RUTAS_API.provinciasDePais(9))
      .flush([{ idProvincia: 55, nombre: 'Colonia' }]);

    expect(fallo).toBe(false);
    expect(resultado).toEqual([{ idProvincia: 55, nombre: 'Colonia', pais: 'Uruguay' }]);
  });

  it('sin países emite una lista vacía (no se queda sin emitir)', () => {
    let resultado: unknown = null;
    servicio.listarProvincias().subscribe((r) => (resultado = r));

    backend.expectOne(RUTAS_API.paises).flush([]);

    expect(resultado).toEqual([]);
  });

  it('si falla el pedido de países, el observable falla', () => {
    let fallo = false;
    servicio.listarProvincias().subscribe({ error: () => (fallo = true) });

    backend.expectOne(RUTAS_API.paises).flush(null, { status: 500, statusText: 'Server Error' });

    expect(fallo).toBe(true);
  });

  it('si falla el pedido de países sin respuesta (status 0), el observable falla', () => {
    let fallo = false;
    servicio.listarProvincias().subscribe({ error: () => (fallo = true) });

    backend.expectOne(RUTAS_API.paises).error(new ProgressEvent('error'));

    expect(fallo).toBe(true);
  });

  it('si las provincias de un país fallan con algo que no es 404, el observable falla', () => {
    let fallo = false;
    servicio.listarProvincias().subscribe({ error: () => (fallo = true) });

    backend.expectOne(RUTAS_API.paises).flush(PAISES);
    backend
      .expectOne(RUTAS_API.provinciasDePais(7))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(fallo).toBe(true);
  });
});
