import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { MateriasHttpService } from './materias-http.service';
import {
  MENSAJE_ERROR_DATOS_ASIGNACION,
  MENSAJE_ERROR_GUARDAR_MATERIAS,
  MENSAJE_ERROR_MATERIAS,
  MENSAJE_ERROR_MIS_MATERIAS,
} from './materias.service';

describe('MateriasHttpService', () => {
  let servicio: MateriasHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MateriasHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(MateriasHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('desenvuelve `data` y traduce nombreMateria a nombre', () => {
    let materias: unknown = null;
    servicio.listarDisponibles().subscribe((m) => (materias = m));

    backend.expectOne(RUTAS_API.materiasDisponibles).flush({
      data: [
        { idMateria: 14, nombreMateria: 'Didáctica General' },
        { idMateria: 3, nombreMateria: ' Programación I ' },
      ],
    });

    expect(materias).toEqual([
      { idMateria: 14, nombre: 'Didáctica General' },
      { idMateria: 3, nombre: 'Programación I' },
    ]);
  });

  it('sin `data` devuelve una lista vacía', () => {
    let materias: unknown = null;
    servicio.listarDisponibles().subscribe((m) => (materias = m));

    backend.expectOne(RUTAS_API.materiasDisponibles).flush({});

    expect(materias).toEqual([]);
  });

  it('las pide en `api/Materias`, que es donde las publica el backend', () => {
    servicio.listarDisponibles().subscribe();

    // La ruta va escrita y no por `RUTAS_API`: apuntaba a `api/Asignaciones`,
    // que el backend dejó de tener, y los otros tests no lo notaban.
    backend
      .expectOne((pedido) => pedido.url.endsWith('/api/Materias/materias-disponibles'))
      .flush({ data: [] });
  });

  it('si falla, da un mensaje legible', () => {
    let mensaje = '';
    servicio.listarDisponibles().subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.materiasDisponibles)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_MATERIAS);
  });
});

describe('MateriasHttpService: mis materias', () => {
  let servicio: MateriasHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MateriasHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(MateriasHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function pedirMisMaterias(): () => string {
    let mensaje = '';
    servicio.listarMisMaterias().subscribe({ error: (e: Error) => (mensaje = e.message) });
    return () => mensaje;
  }

  it('toma el arreglo plano con carrera y curso, y deja en null los vacíos', () => {
    let materias: unknown = null;
    servicio.listarMisMaterias().subscribe((m) => (materias = m));

    backend.expectOne(RUTAS_API.misMaterias).flush([
      { idMateria: 9, nombre: 'Pedagogía', carrera: null, curso: '  ' },
      {
        idMateria: 3,
        nombre: ' Programación I ',
        carrera: ' Tecnicatura en Desarrollo de Software ',
        curso: 'Primer Año',
      },
    ]);

    expect(materias).toEqual([
      { idMateria: 9, nombre: 'Pedagogía', carrera: null, curso: null },
      {
        idMateria: 3,
        nombre: 'Programación I',
        carrera: 'Tecnicatura en Desarrollo de Software',
        curso: 'Primer Año',
      },
    ]);
  });

  it('las ordena por nombre: el backend las manda en el orden de la base', () => {
    let nombres: string[] = [];
    servicio.listarMisMaterias().subscribe((m) => (nombres = m.map((materia) => materia.nombre)));

    backend.expectOne(RUTAS_API.misMaterias).flush([
      { idMateria: 3, nombre: 'Redes', carrera: null, curso: null },
      { idMateria: 6, nombre: 'Álgebra', carrera: null, curso: null },
      { idMateria: 2, nombre: 'Base de Datos', carrera: null, curso: null },
    ]);

    expect(nombres).toEqual(['Álgebra', 'Base de Datos', 'Redes']);
  });

  it('un 404 con texto del servidor muestra ese texto', () => {
    const mensaje = pedirMisMaterias();

    backend
      .expectOne(RUTAS_API.misMaterias)
      .flush('El usuario no tiene un perfil de alumno.', { status: 404, statusText: 'Not Found' });

    expect(mensaje()).toBe('El usuario no tiene un perfil de alumno.');
  });

  it('un 404 sin cuerpo es una ruta inexistente: da el mensaje genérico', () => {
    const mensaje = pedirMisMaterias();

    backend.expectOne(RUTAS_API.misMaterias).flush(null, { status: 404, statusText: 'Not Found' });

    expect(mensaje()).toBe(MENSAJE_ERROR_MIS_MATERIAS);
  });

  it('un 500 da el mensaje genérico aunque traiga texto', () => {
    const mensaje = pedirMisMaterias();

    backend
      .expectOne(RUTAS_API.misMaterias)
      .flush('Object reference not set to an instance of an object.', {
        status: 500,
        statusText: 'Server Error',
      });

    expect(mensaje()).toBe(MENSAJE_ERROR_MIS_MATERIAS);
  });
});

describe('MateriasHttpService: alta de materias y asignaciones', () => {
  let servicio: MateriasHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MateriasHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(MateriasHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lista los docentes desenvolviendo `data`', () => {
    let docentes: unknown = null;
    servicio.listarDocentes().subscribe((d) => (docentes = d));

    backend.expectOne(RUTAS_API.docentesDisponibles).flush({
      data: [
        { idDocente: 2, nombreCompleto: 'Ana Pérez' },
        { idDocente: 9, nombreCompleto: ' ' },
      ],
    });

    expect(docentes).toEqual([
      { idDocente: 2, nombreCompleto: 'Ana Pérez' },
      { idDocente: 9, nombreCompleto: 'Docente sin nombre cargado' },
    ]);
  });

  it('lista las comisiones traduciendo nombreComision a nombre', () => {
    let comisiones: unknown = null;
    servicio.listarComisiones().subscribe((c) => (comisiones = c));

    backend
      .expectOne(RUTAS_API.comisionesDisponibles)
      .flush({ data: [{ idComision: 1, nombreComision: 'Comisión A' }] });

    expect(comisiones).toEqual([{ idComision: 1, nombre: 'Comisión A' }]);
  });

  it('el alta de materia manda CargarMateriaDto y devuelve el mensaje', () => {
    let mensaje = '';
    servicio
      .crearMateria({ nombre: 'Didáctica General', carrera: 'Profesorado de Inglés', curso: '1°' })
      .subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.cargarMateria);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({
      nombreMateria: 'Didáctica General',
      carrera: 'Profesorado de Inglés',
      curso: '1°',
    });
    pedido.flush({ message: 'Materia creada correctamente.', idMateria: 20 });

    expect(mensaje).toBe('Materia creada correctamente.');
  });

  it('una materia repetida muestra el mensaje del backend', () => {
    let mensaje = '';
    servicio
      .crearMateria({ nombre: 'Pedagogía', carrera: 'X', curso: '1°' })
      .subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.cargarMateria)
      .flush(
        { message: 'Ya existe una materia con ese nombre en el sistema.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('Ya existe una materia con ese nombre en el sistema.');
  });

  it('la asignación manda AsignarMateriaDto y devuelve el mensaje', () => {
    let mensaje = '';
    servicio
      .asignar({ idDocente: 2, idMateria: 14, idComision: 1 })
      .subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.asignarMateria);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ idDocente: 2, idMateria: 14, idComision: 1 });
    pedido.flush({ message: 'Materia asignada correctamente al docente en la comisión indicada.' });

    expect(mensaje).toBe('Materia asignada correctamente al docente en la comisión indicada.');
  });

  it('una asignación repetida muestra el mensaje del backend', () => {
    let mensaje = '';
    servicio
      .asignar({ idDocente: 2, idMateria: 14, idComision: 1 })
      .subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.asignarMateria)
      .flush(
        { message: 'El docente ya tiene asignada esta materia en esta comisión.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('El docente ya tiene asignada esta materia en esta comisión.');
  });

  it('un 500 da el mensaje genérico de guardado', () => {
    let mensaje = '';
    servicio
      .asignar({ idDocente: 2, idMateria: 14, idComision: 1 })
      .subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.asignarMateria)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_GUARDAR_MATERIAS);
  });
});

describe('MateriasHttpService: inscribir alumnos (SCRUM-248)', () => {
  let servicio: MateriasHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MateriasHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(MateriasHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('lista los alumnos desenvolviendo `data`', () => {
    let alumnos: unknown = null;
    servicio.listarAlumnos().subscribe((a) => (alumnos = a));

    const pedido = backend.expectOne(RUTAS_API.alumnosDisponibles);
    expect(pedido.request.url).toContain('/api/Materias/alumnos-disponibles');
    pedido.flush({
      data: [
        { idAlumno: 3, nombreCompleto: 'Gómez, Juan (Legajo: 1203)' },
        { idAlumno: 4, nombreCompleto: '   ' },
      ],
    });

    expect(alumnos).toEqual([
      { idAlumno: 3, nombreCompleto: 'Gómez, Juan (Legajo: 1203)' },
      { idAlumno: 4, nombreCompleto: 'Alumno sin nombre cargado' },
    ]);
  });

  it('si no se pueden traer los alumnos da el mensaje de los datos de asignación', () => {
    let mensaje = '';
    servicio.listarAlumnos().subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.alumnosDisponibles)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_DATOS_ASIGNACION);
  });

  it('la inscripción manda AsignarMateriaAlumnoDto y devuelve el mensaje', () => {
    let mensaje = '';
    servicio
      .inscribirAlumno({ idAlumno: 3, idMateria: 14, idComision: 1 })
      .subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.asignarMateriaAlumno);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.url).toContain('/api/Materias/asignar-alumno');
    expect(pedido.request.body).toEqual({ idAlumno: 3, idMateria: 14, idComision: 1 });
    pedido.flush({ message: 'Materia y comisión asignadas al alumno correctamente.' });

    expect(mensaje).toBe('Materia y comisión asignadas al alumno correctamente.');
  });

  it('una inscripción repetida muestra el mensaje del backend', () => {
    let mensaje = '';
    servicio
      .inscribirAlumno({ idAlumno: 3, idMateria: 14, idComision: 1 })
      .subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.asignarMateriaAlumno)
      .flush(
        { message: 'El alumno ya se encuentra inscripto en esa materia y comisión.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('El alumno ya se encuentra inscripto en esa materia y comisión.');
  });
});
