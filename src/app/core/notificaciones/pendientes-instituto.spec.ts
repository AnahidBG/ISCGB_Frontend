import { JustificativoPendiente } from '../justificativos/modelos/justificativo-pendiente';
import { ResumenUsuarioLegajo } from '../legajos/modelos/resumen-usuario-legajo';
import { novedadesPendientesDelInstituto } from './pendientes-instituto';

function justificativo(parcial: Partial<JustificativoPendiente> & { idJustificativo: number }) {
  return {
    nombreDocente: 'Ana Pérez',
    tipoInasistencia: 'Enfermedad',
    rutaArchivo: null,
    fechaCarga: new Date('2026-09-01'),
    ...parcial,
  } satisfies JustificativoPendiente;
}

function persona(parcial: Partial<ResumenUsuarioLegajo> & { idUsuario: number }) {
  return {
    nombreCompleto: 'Juan Gómez',
    dni: '30111222',
    aprobados: 0,
    pendientes: 0,
    rechazados: 0,
    otros: 0,
    total: 0,
    ...parcial,
  } satisfies ResumenUsuarioLegajo;
}

describe('novedadesPendientesDelInstituto', () => {
  it('sin nada pendiente no hay novedades', () => {
    expect(novedadesPendientesDelInstituto([], [])).toEqual({ total: 0, detalle: [] });
  });

  it('ignora a las personas sin documentos esperando revisión', () => {
    const novedades = novedadesPendientesDelInstituto(
      [],
      [persona({ idUsuario: 1, pendientes: 0, aprobados: 4, total: 4 })],
    );

    expect(novedades).toEqual({ total: 0, detalle: [] });
  });

  it('un justificativo avisa quién lo pidió y el motivo, sin enlace (se revisa en Secretaría)', () => {
    const novedades = novedadesPendientesDelInstituto(
      [justificativo({ idJustificativo: 7, nombreDocente: 'Luis Díaz', tipoInasistencia: 'Duelo' })],
      [],
    );

    expect(novedades).toEqual({
      total: 1,
      detalle: [
        {
          titulo: 'Luis Díaz pidió justificar una inasistencia',
          detalle: 'Duelo',
          url: undefined,
          tono: 'pendiente',
        },
      ],
    });
  });

  it('una persona con legajo pendiente lleva a su perfil e indica cuántos documentos esperan', () => {
    const novedades = novedadesPendientesDelInstituto(
      [],
      [
        persona({ idUsuario: 5, nombreCompleto: 'Rosa Gil', pendientes: 1 }),
        persona({ idUsuario: 6, nombreCompleto: 'Pedro Sosa', pendientes: 3 }),
      ],
    );

    expect(novedades.detalle).toEqual([
      {
        titulo: 'Pedro Sosa',
        detalle: '3 documentos esperan revisión',
        url: '/legajo/usuario/6',
        tono: 'pendiente',
      },
      {
        titulo: 'Rosa Gil',
        detalle: '1 documento espera revisión',
        url: '/legajo/usuario/5',
        tono: 'pendiente',
      },
    ]);
  });

  it('el total suma los justificativos y los documentos de legajo, no las filas', () => {
    const novedades = novedadesPendientesDelInstituto(
      [justificativo({ idJustificativo: 1 }), justificativo({ idJustificativo: 2 })],
      [persona({ idUsuario: 1, pendientes: 3 }), persona({ idUsuario: 2, pendientes: 2 })],
    );

    expect(novedades.total).toBe(7);
    expect(novedades.detalle).toHaveLength(4);
  });

  it('primero los justificativos y después las personas', () => {
    const novedades = novedadesPendientesDelInstituto(
      [justificativo({ idJustificativo: 1 })],
      [persona({ idUsuario: 1, pendientes: 1 })],
    );

    expect(novedades.detalle.map((n) => n.url)).toEqual([undefined, '/legajo/usuario/1']);
  });

  it('el detalle trae todas las filas, sin recortar; el total cuenta documentos', () => {
    const justificativos = [1, 2, 3, 4].map((idJustificativo) => justificativo({ idJustificativo }));
    const personas = [10, 11, 12].map((idUsuario) => persona({ idUsuario, pendientes: 1 }));

    const novedades = novedadesPendientesDelInstituto(justificativos, personas);

    expect(novedades.total).toBe(7);
    expect(novedades.detalle).toHaveLength(7);
  });

  it('una persona con 3 documentos es UNA fila pero suma 3 al total', () => {
    const novedades = novedadesPendientesDelInstituto([], [persona({ idUsuario: 1, pendientes: 3 })]);

    expect(novedades.total).toBe(3);
    expect(novedades.detalle).toHaveLength(1);
  });

  it('no muta la lista de personas que recibe', () => {
    const personas = [
      persona({ idUsuario: 1, pendientes: 1 }),
      persona({ idUsuario: 2, pendientes: 9 }),
    ];

    novedadesPendientesDelInstituto([], personas);

    expect(personas.map((p) => p.idUsuario)).toEqual([1, 2]);
  });
});
