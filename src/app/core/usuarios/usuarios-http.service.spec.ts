import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { PerfilUsuario } from './modelos/perfil-usuario';
import { UsuariosHttpService } from './usuarios-http.service';
import { MENSAJE_GESTION_NO_DISPONIBLE } from './usuarios.service';

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
  rol: 'Docente',
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

  it('el alta manda CargaUsuarioDto con el id del rol y la fecha sin hora', () => {
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
      idRol: 3,
      esDirectorSuplente: true,
    });

    pedido.flush({ mensaje: 'Usuario creado exitosamente.', legajoAutocompletado: '12345678' });
    expect(mensaje).toBe('Usuario creado exitosamente. N.° de legajo: 12345678.');
  });

  it('director suplente solo viaja en true para Docentes', () => {
    servicio.crear({ ...PERFIL, rol: 'Alumno' }).subscribe();

    const pedido = backend.expectOne(RUTAS_API.altaUsuario);
    expect(pedido.request.body.esDirectorSuplente).toBe(false);
    expect(pedido.request.body.idRol).toBe(4);
    pedido.flush({});
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
