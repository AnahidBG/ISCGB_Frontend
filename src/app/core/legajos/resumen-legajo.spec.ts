import { DocumentoResumenLegajo } from './modelos/legajo-resumen';
import { contarPorEstado, estadoGeneralDelLegajo, ultimasVersionesPorTipo } from './resumen-legajo';

function doc(
  idLegajo: number,
  idTipoDoc: number | null,
  estado: string | null,
): DocumentoResumenLegajo {
  return { idLegajo, idTipoDoc, estado, rutaArchivo: null };
}

describe('resumen del legajo', () => {
  it('de cada tipo se queda con la versión más nueva (idLegajo más alto)', () => {
    const vigentes = ultimasVersionesPorTipo([
      doc(1, 10, 'Rechazado'),
      doc(5, 10, 'Pendiente'),
      doc(3, 20, 'Aprobado'),
    ]);

    expect(vigentes.map((d) => d.idLegajo).sort()).toEqual([3, 5]);
  });

  it('un rechazo ya corregido no se cuenta', () => {
    const conteo = contarPorEstado([doc(1, 10, 'Rechazado'), doc(2, 10, 'Pendiente')]);

    expect(conteo).toEqual({ aprobados: 0, pendientes: 1, rechazados: 0, otros: 0, total: 1 });
  });

  it('los documentos sin tipo se cuentan cada uno por separado', () => {
    expect(contarPorEstado([doc(1, null, 'Aprobado'), doc(2, null, 'Aprobado')]).total).toBe(2);
  });

  it('estado general: rechazado manda sobre pendiente, y pendiente sobre aprobado', () => {
    expect(estadoGeneralDelLegajo([doc(1, 1, 'Aprobado'), doc(2, 2, 'Rechazado')])).toBe(
      'Rechazado',
    );
    expect(estadoGeneralDelLegajo([doc(1, 1, 'Aprobado'), doc(2, 2, 'Pendiente')])).toBe(
      'Pendiente',
    );
    expect(estadoGeneralDelLegajo([doc(1, 1, 'Aprobado')])).toBe('Aprobado');
  });

  it('un estado desconocido no cuenta como aprobado', () => {
    expect(estadoGeneralDelLegajo([doc(1, 1, 'Aprobado'), doc(2, 2, 'En trámite')])).toBe(
      'Pendiente',
    );
  });

  it('sin documentos no hay estado', () => {
    expect(estadoGeneralDelLegajo([])).toBeNull();
  });
});
