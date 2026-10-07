import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';
import { MOTIVO_SIN_CARGAR, rechazosVigentes } from './rechazos-legajo';

function documento(parcial: Partial<DocumentoLegajo> & { id: number }): DocumentoLegajo {
  return {
    nombre: 'Documento',
    estado: 'Rechazado',
    fechaSubida: new Date('2026-01-01'),
    comentario: null,
    fechaVencimiento: null,
    presentadoFisico: false,
    ...parcial,
  };
}

const DNI: DocumentoRequerido = {
  idTipoDoc: 1,
  nombreDocumento: 'DNI',
  obligatorio: true,
  anual: false,
};

describe('rechazosVigentes (SCRUM-152)', () => {
  it('ignora todo lo que no esté rechazado', () => {
    const rechazos = rechazosVigentes(
      [
        documento({ id: 1, nombre: 'A', estado: 'Aprobado' }),
        documento({ id: 2, nombre: 'B', estado: 'Pendiente' }),
        documento({ id: 3, nombre: 'C', estado: null }),
      ],
      [],
    );

    expect(rechazos).toEqual([]);
  });

  it('trae el documento, el motivo que cargó quien revisó y su tipo para volver a subirlo', () => {
    const rechazado = documento({ id: 1, nombre: 'DNI', comentario: '  Falta sello y/o firma.  ' });

    expect(rechazosVigentes([rechazado], [DNI])).toEqual([
      { documento: rechazado, motivo: 'Falta sello y/o firma.', tipo: DNI },
    ]);
  });

  it.each([null, '', '   '])('sin motivo cargado (%j) lo dice, en vez de dejarlo mudo', (comentario) => {
    const [rechazo] = rechazosVigentes([documento({ id: 1, comentario })], []);

    expect(rechazo.motivo).toBe(MOTIVO_SIN_CARGAR);
  });

  it('un rechazo que ya se corrigió volviendo a subir el documento deja de aparecer', () => {
    const rechazos = rechazosVigentes(
      [
        documento({ id: 1, nombre: 'DNI', fechaSubida: new Date('2026-08-01') }),
        documento({ id: 2, nombre: 'DNI', estado: 'Pendiente', fechaSubida: new Date('2026-09-01') }),
      ],
      [DNI],
    );

    expect(rechazos).toEqual([]);
  });

  it('si la versión nueva también se rechazó, avisa esa y no la vieja', () => {
    const rechazos = rechazosVigentes(
      [
        documento({ id: 1, nombre: 'DNI', comentario: 'Ilegible.', fechaSubida: new Date('2026-08-01') }),
        documento({ id: 2, nombre: 'DNI', comentario: 'Incompleto.', fechaSubida: new Date('2026-09-01') }),
      ],
      [DNI],
    );

    expect(rechazos.map((rechazo) => rechazo.motivo)).toEqual(['Incompleto.']);
  });

  it('pone lo más nuevo primero', () => {
    const rechazos = rechazosVigentes(
      [
        documento({ id: 1, nombre: 'Viejo', fechaSubida: new Date('2026-01-01') }),
        documento({ id: 2, nombre: 'Nuevo', fechaSubida: new Date('2026-08-01') }),
      ],
      [],
    );

    expect(rechazos.map((rechazo) => rechazo.documento.nombre)).toEqual(['Nuevo', 'Viejo']);
  });

  it('si el tipo ya no está entre los de su rol, no inventa uno', () => {
    const [rechazo] = rechazosVigentes([documento({ id: 1, nombre: 'Curriculum' })], [DNI]);

    expect(rechazo.tipo).toBeNull();
  });

  it('no recorta la lista: el tope es cosa de la presentación', () => {
    const rechazados = [1, 2, 3, 4, 5, 6, 7].map((id) => documento({ id, nombre: `Tipo ${id}` }));

    expect(rechazosVigentes(rechazados, [])).toHaveLength(7);
  });
});
