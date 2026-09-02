import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { notificacionesPorRechazos } from './notificaciones-legajo';

function documento(parcial: Partial<DocumentoLegajo> & { id: number }): DocumentoLegajo {
  return {
    nombre: 'Documento',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-01-01'),
    comentario: null,
    fechaVencimiento: null,
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

  it('corta la lista en el máximo pedido', () => {
    const rechazados = [1, 2, 3, 4, 5, 6, 7].map((id) =>
      documento({ id, estado: 'Rechazado' }),
    );

    expect(notificacionesPorRechazos(rechazados)).toHaveLength(5);
    expect(notificacionesPorRechazos(rechazados, { maximo: 2 })).toHaveLength(2);
  });

  it('le pone a cada fila el destino que le pasaron', () => {
    const [novedad] = notificacionesPorRechazos(
      [documento({ id: 1, estado: 'Rechazado' })],
      { url: '/legajo/mis-documentos' },
    );

    expect(novedad.url).toBe('/legajo/mis-documentos');
  });
});
