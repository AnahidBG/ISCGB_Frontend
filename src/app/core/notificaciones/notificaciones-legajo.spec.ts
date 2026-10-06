import { DocumentoLegajo } from '../legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import { RechazoVigente } from '../legajos/rechazos-legajo';
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

function requerido(nombreDocumento: string, obligatorio = true): DocumentoRequerido {
  return { idTipoDoc: nombreDocumento.length, nombreDocumento, obligatorio, anual: false };
}

/** Un rechazo ya resuelto, como los que arma `rechazosVigentes`. */
function rechazo(parcial: Partial<RechazoVigente> & { nombre: string }): RechazoVigente {
  const { nombre, ...resto } = parcial;
  return {
    documento: documento({ id: 1, nombre, estado: 'Rechazado' }),
    motivo: 'Está vencido.',
    tipo: null,
    ...resto,
  };
}

describe('notificacionesPorRechazos', () => {
  it('sin rechazos no hay avisos', () => {
    expect(notificacionesPorRechazos([])).toEqual([]);
  });

  it('arma el aviso con el motivo del rechazo', () => {
    const novedades = notificacionesPorRechazos([rechazo({ nombre: 'Título terciario' })]);

    expect(novedades).toEqual([
      {
        titulo: 'Rechazaron Título terciario',
        detalle: 'Está vencido.',
        url: undefined,
        consulta: undefined,
        tono: 'rechazado',
      },
    ]);
  });

  it('con el tipo del documento, abre Subir Documento con ese tipo ya elegido (SCRUM-152)', () => {
    const [novedad] = notificacionesPorRechazos(
      [rechazo({ nombre: 'DNI', tipo: requerido('DNI') })],
      { url: '/legajo/mis-documentos' },
    );

    expect(novedad.url).toBe('/legajo/subir-documento');
    expect(novedad.consulta).toEqual({ tipo: '3' });
  });

  it('sin el tipo lleva al destino que le pasaron, donde se ve el rechazo', () => {
    const [novedad] = notificacionesPorRechazos([rechazo({ nombre: 'Curriculum' })], {
      url: '/legajo/mis-documentos',
    });

    expect(novedad.url).toBe('/legajo/mis-documentos');
    expect(novedad.consulta).toBeUndefined();
  });

  it('respeta el orden y no recorta la lista: el tope es cosa de la presentación', () => {
    const rechazos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((nombre) => rechazo({ nombre }));

    expect(notificacionesPorRechazos(rechazos).map((novedad) => novedad.titulo)).toEqual(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((nombre) => `Rechazaron ${nombre}`),
    );
  });
});

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
        // Abre el formulario con el tipo elegido (`requerido` usa el largo del nombre como id).
        consulta: { tipo: '11' },
        tono: 'pendiente',
      },
    ]);
  });

  it('un rechazo vigente se avisa con su motivo y abre Subir Documento con su tipo (SCRUM-152)', () => {
    const novedades = novedadesDelLegajo(
      [documento({ id: 1, nombre: 'DNI', estado: 'Rechazado', comentario: 'Documento incompleto' })],
      [requerido('DNI')],
      { url: '/legajo/mis-documentos' },
    );

    expect(novedades.detalle).toEqual([
      {
        titulo: 'Rechazaron DNI',
        detalle: 'Documento incompleto',
        url: '/legajo/subir-documento',
        consulta: { tipo: '3' },
        tono: 'rechazado',
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
    // Abre Subir Documento con el mismo tipo elegido (el id de `requerido` es el largo del nombre).
    expect(novedades.detalle[0].url).toBe('/legajo/subir-documento');
    expect(novedades.detalle[0].consulta).toEqual({ tipo: '11' });
  });

  it('un vencido cuyo tipo ya no está entre los de su rol abre Subir Documento sin tipo elegido', () => {
    const novedades = novedadesDelLegajo(
      [
        documento({
          id: 1,
          nombre: 'Apto médico',
          estado: 'Aprobado',
          fechaVencimiento: new Date('2026-01-01'),
        }),
      ],
      [requerido('DNI')],
      { ahora: new Date('2026-09-28').getTime() },
    );

    const vencido = novedades.detalle.find((n) => n.titulo === 'Se venció Apto médico')!;
    expect(vencido.url).toBe('/legajo/subir-documento');
    expect(vencido.consulta).toBeUndefined();
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

  it('un anual vencido que se volvió a subir no anuncia el legajo completo', () => {
    // La versión vieja sigue aprobada en la base, pero la vigente espera revisión.
    const novedades = novedadesDelLegajo(
      [
        documento({
          id: 1,
          nombre: 'Apto médico',
          estado: 'Aprobado',
          fechaSubida: new Date('2025-03-01'),
          fechaVencimiento: new Date('2026-01-01'),
        }),
        documento({
          id: 2,
          nombre: 'Apto médico',
          estado: 'Pendiente',
          fechaSubida: new Date('2026-09-20'),
        }),
      ],
      [requerido('Apto médico')],
      { ahora: new Date('2026-09-28').getTime() },
    );

    expect(novedades.detalle).toEqual([]);
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
