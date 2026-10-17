import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { CalendarioExamenesHttpService } from './calendario-examenes-http.service';
import {
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_ELIMINAR_EXAMEN,
  MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
  MENSAJE_ERROR_LIMITE_DIARIO,
  MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
  MENSAJE_ERROR_REGISTRAR_EXAMEN,
  MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
  MENSAJE_ERROR_TIPOS_DE_EXAMEN,
} from './calendario-examenes.service';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';
import { MesaAsignada } from './modelos/mesa-asignada';
import { NuevoExamen } from './modelos/nuevo-examen';
import { TipoExamen } from './modelos/tipo-examen';

describe('CalendarioExamenesHttpService (SCRUM-183)', () => {
  let servicio: CalendarioExamenesHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalendarioExamenesHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CalendarioExamenesHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('pide estado-mes con el año y el mes por query', () => {
    servicio.calendarioDelMes(2026, 10).subscribe();

    const pedido = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.urlWithParams).toContain(
      '/api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10',
    );
    pedido.flush({ limiteDiario: 2, diasOcupados: [] });
  });

  it('adapta la respuesta: todos los días del mes, con su estado, sin correr la fecha un día', () => {
    let calendario: CalendarioDelMes | undefined;
    servicio.calendarioDelMes(2026, 10).subscribe((valor) => (calendario = valor));

    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10)).flush({
      limiteDiario: 2,
      // Un `DateTime` de .NET serializado: sin zona, a medianoche.
      diasOcupados: [
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      ],
    });

    expect(calendario?.limite).toBe(2);
    expect(calendario?.dias).toHaveLength(31);
    expect(calendario?.dias[0]).toEqual({
      fecha: '2026-10-01',
      cantidad: 0,
      limite: 2,
      estado: 'disponible',
    });
    expect(calendario?.dias[12]).toEqual({
      fecha: '2026-10-13',
      cantidad: 1,
      limite: 2,
      estado: 'ocupado',
    });
    expect(calendario?.dias[19]).toMatchObject({ fecha: '2026-10-20', estado: 'completo' });
  });

  it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL, y sin la opción no', () => {
    servicio.calendarioDelMes(2026, 10, { enSegundoPlano: true }).subscribe();
    const enSegundoPlano = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(enSegundoPlano.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
    enSegundoPlano.flush({ limiteDiario: 2, diasOcupados: [] });

    servicio.calendarioDelMes(2026, 11).subscribe();
    const conVelo = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 11));
    expect(conVelo.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
    conVelo.flush({ limiteDiario: 2, diasOcupados: [] });
  });

  it('un día que no se puede leer no tira abajo el mes: queda disponible', () => {
    let calendario: CalendarioDelMes | undefined;
    servicio.calendarioDelMes(2026, 10).subscribe((valor) => (calendario = valor));

    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10)).flush({
      limiteDiario: 2,
      diasOcupados: [
        { fecha: 'ayer', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
      ],
    });

    expect(calendario?.dias).toHaveLength(31);
    expect(calendario?.dias.filter((dia) => dia.cantidad > 0).map((dia) => dia.fecha)).toEqual([
      '2026-10-13',
    ]);
  });

  it.each([
    [
      'el servidor falla (un mes inválido responde 500)',
      () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } }),
    ],
    [
      'la respuesta no trae el límite diario',
      () => ({ cuerpo: { diasOcupados: [] }, opciones: {} }),
    ],
    [
      'la respuesta no trae la lista de días',
      () => ({ cuerpo: { limiteDiario: 2, diasOcupados: 'nada' }, opciones: {} }),
    ],
  ])('falla con el mensaje de siempre cuando %s', (_caso, respuesta) => {
    let mensaje: string | undefined;
    servicio
      .calendarioDelMes(2026, 13)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    const { cuerpo, opciones } = respuesta();
    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 13)).flush(cuerpo, opciones);

    expect(mensaje).toBe(MENSAJE_ERROR_CALENDARIO);
  });

  describe('exámenes del mes (`del-mes`)', () => {
    beforeEach(() => {
      // Solo el reloj: los timers de verdad tienen que seguir andando.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 10));
    });

    it('en el mes en curso los pide a `del-mes` y los adapta', () => {
      let examenes: ExamenCalendario[] | undefined;
      servicio.examenesDelMes(2026, 10).subscribe((valor) => (examenes = valor));

      const pedido = backend.expectOne(RUTAS_API.examenesDelMesEnCurso);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/del-mes');
      pedido.flush([
        {
          idExamen: 7,
          materia: 'Redes',
          fecha: '2026-10-20T09:00:00',
          comision: 'Comisión 1° A',
          tipoExamen: 'Parcial',
        },
      ]);

      expect(examenes).toEqual([
        {
          idExamen: 7,
          fecha: '2026-10-20',
          horario: '09:00',
          materia: 'Redes',
          comision: 'Comisión 1° A',
          tipo: 'Parcial',
        },
      ]);
    });

    it('otro mes no pega contra el backend: `del-mes` solo trae el mes en curso', () => {
      let examenes: ExamenCalendario[] | undefined;
      servicio.examenesDelMes(2026, 11).subscribe((valor) => (examenes = valor));

      // `backend.verify()`, en el afterEach, falla si salió algún pedido.
      expect(examenes).toEqual([]);
    });

    it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL', () => {
      servicio.examenesDelMes(2026, 10, { enSegundoPlano: true }).subscribe();

      const pedido = backend.expectOne(RUTAS_API.examenesDelMesEnCurso);
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([]);
    });

    it.each([
      ['el servidor falla', () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } })],
      ['la respuesta no es una lista', () => ({ cuerpo: { data: [] }, opciones: {} })],
    ])('falla con el mensaje del calendario cuando %s', (_caso, respuesta) => {
      let mensaje: string | undefined;
      servicio
        .examenesDelMes(2026, 10)
        .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

      const { cuerpo, opciones } = respuesta();
      backend.expectOne(RUTAS_API.examenesDelMesEnCurso).flush(cuerpo, opciones);

      expect(mensaje).toBe(MENSAJE_ERROR_CALENDARIO);
    });
  });

  it('el límite vigente sale del `estado-mes` del mes actual', () => {
    // Solo el reloj: los timers de verdad tienen que seguir andando.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 10));

    let limite: number | undefined;
    servicio.limiteDiario().subscribe((valor) => (limite = valor));

    const pedido = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(pedido.request.method).toBe('GET');
    pedido.flush({
      limiteDiario: 3,
      diasOcupados: [{ fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false }],
    });

    expect(limite).toBe(3);
  });

  it('si no se puede leer el límite falla con su propio mensaje y no con el del calendario', () => {
    let mensaje: string | undefined;
    servicio.limiteDiario().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne((pedido) => pedido.url.includes('/estado-mes'))
      .flush(null, { status: 500, statusText: 'Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_LIMITE_DIARIO);
  });

  it('guardar el límite manda `{ nuevoLimite }` por PUT', () => {
    let guardado = false;
    servicio.guardarLimiteDiario(3).subscribe(() => (guardado = true));

    const pedido = backend.expectOne(RUTAS_API.limiteParcialesCalendario);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ nuevoLimite: 3 });
    pedido.flush({
      message: 'El límite de parciales por día se ha actualizado con éxito.',
      nuevoLimite: 3,
    });

    expect(guardado).toBe(true);
  });

  it('si el backend rechaza el límite (400), guardar falla con SU mensaje', () => {
    let mensaje: string | undefined;
    servicio
      .guardarLimiteDiario(0)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.limiteParcialesCalendario)
      .flush(
        { message: 'El límite de parciales Diarios debe ser mayor a cero.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('El límite de parciales Diarios debe ser mayor a cero.');
  });

  it('ante un error del servidor (500), guardar el límite falla con el mensaje genérico', () => {
    let mensaje: string | undefined;
    servicio
      .guardarLimiteDiario(3)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.limiteParcialesCalendario)
      .flush({ message: 'NullReferenceException' }, { status: 500, statusText: 'Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO);
  });

  describe('mesas asignadas al docente', () => {
    it('pide mis-notificaciones y traduce la fecha con hora a hora local, sin usar el mensaje', () => {
      let mesas: MesaAsignada[] | undefined;
      servicio.mesasAsignadas({ enSegundoPlano: true }).subscribe((valor) => (mesas = valor));

      const pedido = backend.expectOne(RUTAS_API.misMesasAsignadas);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.url).toContain('/api/Configuracion/mis-notificaciones');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([
        {
          idExamen: 1,
          materia: 'Redes',
          // Un `DateTime` de .NET serializado: sin zona, CON hora.
          fecha: '2026-11-20T09:00:00',
          mensaje: 'Ha sido asignado a la mesa de Redes el día 20/11/2026 09:00',
        },
      ]);

      expect(mesas).toEqual([
        { idExamen: 1, materia: 'Redes', fecha: new Date(2026, 10, 20, 9, 0) },
      ]);
    });

    it('un usuario sin perfil de docente (404) no tiene mesas: no es un error', () => {
      let mesas: MesaAsignada[] | undefined;
      servicio.mesasAsignadas().subscribe((valor) => (mesas = valor));

      backend
        .expectOne(RUTAS_API.misMesasAsignadas)
        .flush({ message: 'Docente no encontrado.' }, { status: 404, statusText: 'Not Found' });

      expect(mesas).toEqual([]);
    });

    it.each([
      [
        'el servidor falla',
        () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } }),
      ],
      ['la respuesta no es una lista', () => ({ cuerpo: { mesas: [] }, opciones: {} })],
      [
        'una mesa trae una fecha que no es una fecha',
        () => ({
          cuerpo: [{ idExamen: 1, materia: 'Redes', fecha: 'pronto', mensaje: '' }],
          opciones: {},
        }),
      ],
    ])('falla con el mensaje de siempre cuando %s', (_caso, respuesta) => {
      let mensaje: string | undefined;
      servicio.mesasAsignadas().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

      const { cuerpo, opciones } = respuesta();
      backend.expectOne(RUTAS_API.misMesasAsignadas).flush(cuerpo, opciones);

      expect(mensaje).toBe(MENSAJE_ERROR_MESAS_ASIGNADAS);
    });
  });

  describe('registro de un parcial', () => {
    const PARCIAL: NuevoExamen = {
      dia: '2026-10-13',
      horario: '23:30',
      idMateria: 4,
      idComision: 1,
      idTipoExamen: 2,
    };

    it('las materias del docente traen la materia con su comisión, en segundo plano', () => {
      let materias: MateriaDelDocente[] | undefined;
      servicio
        .materiasDelDocente({ enSegundoPlano: true })
        .subscribe((valor) => (materias = valor));

      const pedido = backend.expectOne(RUTAS_API.misMateriasDocente);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/mis-materias-docente');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([
        {
          idMateria: 4,
          nombreMateria: 'Programacion II',
          carrera: 'Tecnicatura en Desarrollo de Software',
          idComision: 1,
          nombreComision: 'Comisión A',
        },
        {
          idMateria: 7,
          nombreMateria: 'Redes',
          carrera: '  ',
          idComision: 2,
          nombreComision: 'Comisión B',
        },
      ]);

      expect(materias).toEqual([
        {
          idMateria: 4,
          materia: 'Programacion II',
          carrera: 'Tecnicatura en Desarrollo de Software',
          idComision: 1,
          comision: 'Comisión A',
        },
        { idMateria: 7, materia: 'Redes', carrera: null, idComision: 2, comision: 'Comisión B' },
      ]);
    });

    it('un docente sin perfil (404 con mensaje) no tiene materias: no es un error', () => {
      let materias: MateriaDelDocente[] | undefined;
      servicio.materiasDelDocente().subscribe((valor) => (materias = valor));

      backend
        .expectOne(RUTAS_API.misMateriasDocente)
        .flush(
          { message: 'El usuario no tiene un perfil de docente.' },
          { status: 404, statusText: 'Not Found' },
        );

      expect(materias).toEqual([]);
    });

    it('los tipos de examen se muestran como vienen', () => {
      let tipos: TipoExamen[] | undefined;
      servicio.tiposDeExamen({ enSegundoPlano: true }).subscribe((valor) => (tipos = valor));

      const pedido = backend.expectOne(RUTAS_API.tiposDeExamen);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([
        { idTipoExamen: 1, nombre: 'Parcial' },
        { idTipoExamen: 2, nombre: 'Recupetario' },
      ]);

      expect(tipos).toEqual([
        { idTipoExamen: 1, nombre: 'Parcial' },
        { idTipoExamen: 2, nombre: 'Recupetario' },
      ]);
    });

    it.each<[string, () => Observable<unknown>, string, string]>([
      [
        'las materias',
        () => servicio.materiasDelDocente(),
        RUTAS_API.misMateriasDocente,
        MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
      ],
      [
        'los tipos de examen',
        () => servicio.tiposDeExamen(),
        RUTAS_API.tiposDeExamen,
        MENSAJE_ERROR_TIPOS_DE_EXAMEN,
      ],
    ])(
      'si fallan %s, o la respuesta no se puede leer, falla con su mensaje',
      (_caso, pedir, ruta, esperado) => {
        const mensajes: string[] = [];
        const alFallar = { error: (fallo: Error) => mensajes.push(fallo.message) };

        pedir().subscribe(alFallar);
        backend.expectOne(ruta).flush(null, { status: 500, statusText: 'Error' });

        pedir().subscribe(alFallar);
        backend.expectOne(ruta).flush([{ nombre: 'sin ids' }]);

        expect(mensajes).toEqual([esperado, esperado]);
      },
    );

    it('registrar manda { fecha, idComision, idMateria, idTipoExamen } con la fecha en texto local', () => {
      let registrado = false;
      servicio
        .registrarExamen(PARCIAL, { enSegundoPlano: true })
        .subscribe(() => (registrado = true));

      const pedido = backend.expectOne(RUTAS_API.registrarExamen);
      expect(pedido.request.method).toBe('POST');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/registrar');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      // A las 23:30 una conversión por UTC lo pasaría al día siguiente.
      expect(pedido.request.body).toEqual({
        fecha: '2026-10-13T23:30:00',
        idComision: 1,
        idMateria: 4,
        idTipoExamen: 2,
      });
      pedido.flush({ message: 'Examen registrado correctamente.' });

      expect(registrado).toBe(true);
    });

    it('si el día alcanzó el límite (400), registrar falla con el texto del backend', () => {
      let mensaje: string | undefined;
      servicio
        .registrarExamen(PARCIAL)
        .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

      backend
        .expectOne(RUTAS_API.registrarExamen)
        .flush(
          { message: 'No se puede registrar. Se ha superado el límite de parciales para ese día.' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(mensaje).toBe(
        'No se puede registrar. Se ha superado el límite de parciales para ese día.',
      );
    });

    it('ante un error del servidor (500), registrar falla con el mensaje genérico', () => {
      let mensaje: string | undefined;
      servicio
        .registrarExamen(PARCIAL)
        .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

      backend
        .expectOne(RUTAS_API.registrarExamen)
        .flush({ message: 'Violación de clave foránea' }, { status: 500, statusText: 'Error' });

      expect(mensaje).toBe(MENSAJE_ERROR_REGISTRAR_EXAMEN);
    });
  });

  describe('reprogramar y eliminar un parcial (SCRUM-184)', () => {
    it('reprogramar manda { nuevaFecha } por PUT al id del examen, en segundo plano', () => {
      let reprogramado = false;
      servicio
        .reprogramarExamen(7, '2026-10-20T23:30:00', { enSegundoPlano: true })
        .subscribe(() => (reprogramado = true));

      const pedido = backend.expectOne(RUTAS_API.modificarExamen(7));
      expect(pedido.request.method).toBe('PUT');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/modificar/7');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      // La fecha viaja tal cual la armó quien llama: sin pasar por UTC.
      expect(pedido.request.body).toEqual({ nuevaFecha: '2026-10-20T23:30:00' });
      pedido.flush({ message: 'La fecha del examen se ha modificado correctamente.' });

      expect(reprogramado).toBe(true);
    });

    it('eliminar pega un DELETE al id del examen, en segundo plano', () => {
      let eliminado = false;
      servicio.eliminarExamen(7, { enSegundoPlano: true }).subscribe(() => (eliminado = true));

      const pedido = backend.expectOne(RUTAS_API.eliminarExamen(7));
      expect(pedido.request.method).toBe('DELETE');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/eliminar/7');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush({ message: 'El examen ha sido eliminado del calendario correctamente.' });

      expect(eliminado).toBe(true);
    });

    const LIMITE_SUPERADO = 'No se puede reprogramar. El día ha superado el límite de parciales.';
    const NO_ENCONTRADO = 'No se encontró el examen especificado.';

    it.each<[string, () => Observable<void>, string, number, string, string]>([
      [
        'reprogramar con el día completo (400)',
        () => servicio.reprogramarExamen(7, '2026-10-20T09:00:00'),
        RUTAS_API.modificarExamen(7),
        400,
        LIMITE_SUPERADO,
        LIMITE_SUPERADO,
      ],
      [
        'reprogramar un examen que no existe (404)',
        () => servicio.reprogramarExamen(7, '2026-10-20T09:00:00'),
        RUTAS_API.modificarExamen(7),
        404,
        NO_ENCONTRADO,
        NO_ENCONTRADO,
      ],
      [
        'reprogramar con un error del servidor (500)',
        () => servicio.reprogramarExamen(7, '2026-10-20T09:00:00'),
        RUTAS_API.modificarExamen(7),
        500,
        'NullReferenceException',
        MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
      ],
      [
        'eliminar un examen que no existe (404)',
        () => servicio.eliminarExamen(7),
        RUTAS_API.eliminarExamen(7),
        404,
        NO_ENCONTRADO,
        NO_ENCONTRADO,
      ],
      [
        'eliminar con un error del servidor (500)',
        () => servicio.eliminarExamen(7),
        RUTAS_API.eliminarExamen(7),
        500,
        'Violación de clave foránea',
        MENSAJE_ERROR_ELIMINAR_EXAMEN,
      ],
    ])(
      '%s: el texto del backend si es un rechazo del pedido, y el genérico si no',
      (_caso, pedir, ruta, status, delServidor, esperado) => {
        let mensaje: string | undefined;
        pedir().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

        backend.expectOne(ruta).flush({ message: delServidor }, { status, statusText: 'Error' });

        expect(mensaje).toBe(esperado);
      },
    );
  });
});
