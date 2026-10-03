import { DocumentoLegajo } from '../legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import { novedadesDelLegajo, notificacionesPorRechazos } from './notificaciones-legajo';

function documento(parcial: Partial<DocumentoLegajo> & { id: number }): DocumentoLegajo {
  return {
    nombre: 'Documento',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-01-01'),
    comentario: null,
    fechaVencimiento: null,
    presentadoFisico: false,
    ...parcial,
  };
}

describe('notificacionesPorRechazos', () => {
  it('ignora todo lo que no esté rechazado', () => {
    const novedades = notificacionesPorRechazos([
      documento({ id: 1, estado: 'Aprobado' }),
      documento({ id: 2, estado: 'Pendiente' }),
      documento({ id: 3, estado: null }),
    ]);

    expect(novedades).toEqual([]);
  });

  it('arma el aviso con el motivo del rechazo', () => {
    const novedades = notificacionesPorRechazos([
      documento({
        id: 1,
        nombre: 'Título terciario',
        estado: 'Rechazado',
        comentario: 'Está vencido.',
      }),
    ]);

    expect(novedades).toEqual([
      {
        titulo: 'Rechazaron Título terciario',
        detalle: 'Está vencido.',
        url: undefined,
        tono: 'rechazado',
      },
    ]);
  });

  it('cuando no hay motivo cargado lo dice en vez de dejar la fila muda', () => {
    const [novedad] = notificacionesPorRechazos([
      documento({ id: 1, estado: 'Rechazado', comentario: null }),
    ]);

    expect(novedad.detalle).toBe('Sin motivo cargado: consultá en Secretaría.');
  });

  it('pone lo más nuevo primero', () => {
    const novedades = notificacionesPorRechazos([
      documento({
        id: 1,
        nombre: 'Viejo',
        estado: 'Rechazado',
        fechaSubida: new Date('2026-01-01'),
      }),
      documento({
        id: 2,
        nombre: 'Nuevo',
        estado: 'Rechazado',
        fechaSubida: new Date('2026-08-01'),
      }),
    ]);

    expect(novedades.map((novedad) => novedad.titulo)).toEqual([
      'Rechazaron Nuevo',
      'Rechazaron Viejo',
    ]);
  });

  it('no recorta la lista: el tope es cosa de la presentación, no de core/', () => {
    const rechazados = [1, 2, 3, 4, 5, 6, 7].map((id) => documento({ id, estado: 'Rechazado' }));

    expect(notificacionesPorRechazos(rechazados)).toHaveLength(7);
  });

  it('le pone a cada fila el destino que le pasaron', () => {
    const [novedad] = notificacionesPorRechazos([documento({ id: 1, estado: 'Rechazado' })], {
      url: '/legajo/mis-documentos',
    });

    expect(novedad.url).toBe('/legajo/mis-documentos');
  });
});

function requerido(nombreDocumento: string, obligatorio = true): DocumentoRequerido {
  return { idTipoDoc: nombreDocumento.length, nombreDocumento, obligatorio, anual: false };
}

describe('novedadesDelLegajo', () => {
  it('no avisa un rechazo que la persona ya corrigió volviendo a subir el documento', () => {
    const novedades = novedadesDelLegajo(
      [
        documento({
          id: 1,
          nombre: 'DNI',
          estado: 'Rechazado',
          fechaSubida: new Date('2026-01-01'),
        }),
        documento({
          id: 2,
          nombre: 'DNI',
          estado: 'Pendiente',
          fechaSubida: new Date('2026-02-01'),
        }),
      ],
      [requerido('DNI')],
    );

    expect(novedades.total).toBe(0);
  });

  it('avisa lo obligatorio que falta entregar, con el texto del mail de SCRUM-156', () => {
    const novedades = novedadesDelLegajo(
      [documento({ id: 1, nombre: 'DNI', estado: 'Aprobado' })],
      [requerido('DNI'), requerido('Apto médico'), requerido('Opcional', false)],
    );

    expect(novedades.detalle).toEqual([
      {
        titulo: 'Falta entregar Apto médico',
        detalle: 'Cargalo desde Subir Documento y entregalo en papel en Secretaría.',
        url: '/legajo/subir-documento',
        tono: 'pendiente',
      },
    ]);
  });

  it('primero los rechazos, después los faltantes', () => {
    const novedades = novedadesDelLegajo(
      [documento({ id: 1, nombre: 'DNI', estado: 'Rechazado' })],
      [requerido('DNI'), requerido('Título')],
    );

    expect(novedades.detalle.map((n) => n.tono)).toEqual(['rechazado', 'pendiente']);
  });

  it('avisa un documento anual aprobado que ya venció', () => {
    const novedades = novedadesDelLegajo(
      [
        documento({
          id: 1,
          nombre: 'Apto médico',
          estado: 'Aprobado',
          fechaVencimiento: new Date('2026-01-01'),
        }),
      ],
      [requerido('Apto médico')],
      { ahora: new Date('2026-09-28').getTime() },
    );

    expect(novedades.detalle[0].titulo).toBe('Se venció Apto médico');
  });

  it('con todo lo obligatorio aprobado avisa que el legajo está completo (SCRUM-153)', () => {
    const novedades = novedadesDelLegajo(
      [documento({ id: 1, nombre: 'DNI', estado: 'Aprobado' })],
      [requerido('DNI')],
    );

    expect(novedades.detalle).toEqual([
      {
        titulo: '¡Tu legajo está completo!',
        detalle: 'Todos los documentos obligatorios están aprobados.',
        tono: 'aprobado',
      },
    ]);
  });

  it('sin saber qué le corresponde al rol no declara el legajo completo', () => {
    const novedades = novedadesDelLegajo([documento({ id: 1, estado: 'Aprobado' })], []);

    expect(novedades.total).toBe(0);
  });

  it('el detalle trae TODAS las novedades, sin recortar, y coincide con el total', () => {
    const requeridos = ['A', 'BB', 'CCC', 'DDDD', 'EEEEE', 'FFFFFF', 'GGGGGGG'].map((n) =>
      requerido(n),
    );
    const novedades = novedadesDelLegajo([], requeridos);

    expect(novedades.total).toBe(7);
    expect(novedades.detalle).toHaveLength(7);
  });
});
