import { Observable, Subject, of, throwError } from 'rxjs';
import { LegajoService, MENSAJE_ERROR_LEGAJO } from './legajo.service';
import {
  LEGAJO_CARGANDO,
  LegajoPropio,
  cargarLegajoPropio,
  documentosDe,
  errorDe,
  requeridosDe,
} from './legajo-propio';
import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';

const DNI: DocumentoLegajo = {
  id: 1,
  nombre: 'DNI',
  estado: 'Aprobado',
  fechaSubida: new Date('2026-10-01'),
  comentario: null,
  fechaVencimiento: null,
  presentadoFisico: false,
};

const REQUERIDO_DNI: DocumentoRequerido = {
  idTipoDoc: 1,
  nombreDocumento: 'DNI',
  obligatorio: true,
  anual: false,
};

/** Solo las dos operaciones que usa la función; el resto del contrato no hace falta. */
function servicio(fuentes: {
  documentos: Observable<DocumentoLegajo[]>;
  requeridos?: Observable<DocumentoRequerido[]>;
}): { legajos: LegajoService; rolesPedidos: number[] } {
  const rolesPedidos: number[] = [];
  const legajos = {
    obtenerLegajoPropio: () => fuentes.documentos,
    documentosRequeridos: (idRol: number) => {
      rolesPedidos.push(idRol);
      return fuentes.requeridos ?? of([]);
    },
  } as unknown as LegajoService;
  return { legajos, rolesPedidos };
}

function fases(origen: Observable<LegajoPropio>): LegajoPropio[] {
  const emitidas: LegajoPropio[] = [];
  origen.subscribe((fase) => emitidas.push(fase));
  return emitidas;
}

describe('cargarLegajoPropio', () => {
  it('arranca cargando y queda listo con los documentos y lo que pide el rol', () => {
    const { legajos, rolesPedidos } = servicio({
      documentos: of([DNI]),
      requeridos: of([REQUERIDO_DNI]),
    });

    expect(fases(cargarLegajoPropio(legajos, 3))).toEqual([
      { fase: 'cargando' },
      { fase: 'listo', documentos: [DNI], requeridos: [REQUERIDO_DNI] },
    ]);
    expect(rolesPedidos).toEqual([3]);
  });

  it('no da nada por listo hasta que llegan LOS DOS pedidos', () => {
    const requeridos = new Subject<DocumentoRequerido[]>();
    const { legajos } = servicio({ documentos: of([DNI]), requeridos });
    const emitidas = fases(cargarLegajoPropio(legajos, 3));

    // Con los documentos solos, todo lo obligatorio parecería "sin cargar".
    expect(emitidas).toEqual([{ fase: 'cargando' }]);

    requeridos.next([REQUERIDO_DNI]);
    requeridos.complete();
    expect(emitidas.at(-1)).toEqual({
      fase: 'listo',
      documentos: [DNI],
      requeridos: [REQUERIDO_DNI],
    });
  });

  it('sin id de rol no pide los requeridos y queda listo sin ellos', () => {
    const { legajos, rolesPedidos } = servicio({ documentos: of([DNI]) });

    expect(fases(cargarLegajoPropio(legajos, null)).at(-1)).toEqual({
      fase: 'listo',
      documentos: [DNI],
      requeridos: [],
    });
    expect(rolesPedidos).toEqual([]);
  });

  it('si falla el legajo queda en error, con el mensaje del servicio', () => {
    const { legajos } = servicio({
      documentos: throwError(() => new Error('No pudimos traer el legajo.')),
    });

    expect(fases(cargarLegajoPropio(legajos, 3))).toEqual([
      { fase: 'cargando' },
      { fase: 'error', mensaje: 'No pudimos traer el legajo.' },
    ]);
  });

  it('si fallan los requeridos también es un error: sin ellos no se sabe qué falta', () => {
    const { legajos } = servicio({
      documentos: of([DNI]),
      requeridos: throwError(() => new Error('Sin requeridos.')),
    });

    expect(fases(cargarLegajoPropio(legajos, 3)).at(-1)).toEqual({
      fase: 'error',
      mensaje: 'Sin requeridos.',
    });
  });

  it('un fallo sin mensaje usa el genérico del legajo', () => {
    const { legajos } = servicio({ documentos: throwError(() => 'se cayó') });

    expect(fases(cargarLegajoPropio(legajos, 3)).at(-1)).toEqual({
      fase: 'error',
      mensaje: MENSAJE_ERROR_LEGAJO,
    });
  });
});

describe('lo que la pantalla lee del legajo propio', () => {
  const listo: LegajoPropio = { fase: 'listo', documentos: [DNI], requeridos: [REQUERIDO_DNI] };
  const error: LegajoPropio = { fase: 'error', mensaje: 'No pudimos traer el legajo.' };

  it('los documentos y los requeridos solo existen cuando está listo', () => {
    expect(documentosDe(listo)).toEqual([DNI]);
    expect(requeridosDe(listo)).toEqual([REQUERIDO_DNI]);

    for (const fase of [LEGAJO_CARGANDO, error]) {
      expect(documentosDe(fase)).toEqual([]);
      expect(requeridosDe(fase)).toEqual([]);
    }
  });

  it('el mensaje de error solo existe cuando falló', () => {
    expect(errorDe(error)).toBe('No pudimos traer el legajo.');
    expect(errorDe(listo)).toBeNull();
    expect(errorDe(LEGAJO_CARGANDO)).toBeNull();
  });
});
