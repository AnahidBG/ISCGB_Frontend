import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';
import {
  calcularProgresoLegajo,
  obligatoriosSinCargar,
  requeridoDelDocumento,
  ultimaVersionPorTipo,
} from './progreso-legajo';

function documento(
  nombre: string,
  estado: string | null,
  fechaSubida = new Date('2026-08-01'),
): DocumentoLegajo {
  return {
    id: Math.random(),
    nombre,
    estado,
    fechaSubida,
    comentario: null,
    fechaVencimiento: null,
    presentadoFisico: false,
  };
}

function requerido(nombreDocumento: string, obligatorio = true): DocumentoRequerido {
  return { idTipoDoc: Math.random(), nombreDocumento, obligatorio, anual: false };
}

describe('calcularProgresoLegajo', () => {
  it('sin documentos ni requeridos da 0 y no rompe', () => {
    const progreso = calcularProgresoLegajo([], []);

    expect(progreso.porcentaje).toBe(0);
    expect(progreso.aprobados).toBe(0);
  });

  it('mide contra los OBLIGATORIOS del rol, no contra lo que subió', () => {
    // Subió uno solo y se lo aprobaron, pero el instituto le pide cuatro.
    // El cálculo viejo daba 100%; el correcto da 25%.
    const progreso = calcularProgresoLegajo(
      [documento('DNI', 'Aprobado')],
      [requerido('DNI'), requerido('Título'), requerido('Apto Físico'), requerido('CUIL')],
    );

    expect(progreso.porcentaje).toBe(25);
    expect(progreso.aprobados).toBe(1);
    expect(progreso.total).toBe(4);
    expect(progreso.estimado).toBe(false);
  });

  it('los documentos opcionales no cuentan en el denominador', () => {
    const progreso = calcularProgresoLegajo(
      [documento('DNI', 'Aprobado')],
      [requerido('DNI'), requerido('Foto carnet', false)],
    );

    expect(progreso.porcentaje).toBe(100);
    expect(progreso.total).toBe(1);
  });

  it('solo cuenta los aprobados: pendiente y rechazado no suman', () => {
    const progreso = calcularProgresoLegajo(
      [
        documento('DNI', 'Aprobado'),
        documento('Título', 'Pendiente'),
        documento('Apto Físico', 'Rechazado'),
        documento('CUIL', null),
      ],
      [requerido('DNI'), requerido('Título'), requerido('Apto Físico'), requerido('CUIL')],
    );

    expect(progreso.porcentaje).toBe(25);
  });

  it('cruza los nombres sin que las tildes ni las mayúsculas lo rompan', () => {
    const progreso = calcularProgresoLegajo(
      [documento('apto fisico ', 'Aprobado')],
      [requerido('Apto Físico')],
    );

    expect(progreso.porcentaje).toBe(100);
  });

  it('el mismo documento subido dos veces cuenta una sola', () => {
    const progreso = calcularProgresoLegajo(
      [documento('DNI', 'Aprobado'), documento('DNI', 'Aprobado')],
      [requerido('DNI'), requerido('Título')],
    );

    expect(progreso.aprobados).toBe(1);
    expect(progreso.porcentaje).toBe(50);
  });

  it('sin lista de requeridos cae al cálculo estimado y lo marca', () => {
    const progreso = calcularProgresoLegajo(
      [documento('DNI', 'Aprobado'), documento('Título', 'Pendiente')],
      [],
    );

    expect(progreso.estimado).toBe(true);
    expect(progreso.porcentaje).toBe(50);
  });

  it('nunca pasa de 100 aunque haya más aprobados que obligatorios', () => {
    const progreso = calcularProgresoLegajo(
      [documento('DNI', 'Aprobado'), documento('Foto', 'Aprobado')],
      [requerido('DNI')],
    );

    expect(progreso.porcentaje).toBe(100);
  });
});

describe('ultimaVersionPorTipo', () => {
  it('de dos versiones del mismo documento, se queda con la más nueva', () => {
    const version = ultimaVersionPorTipo([
      documento('Certificado de Salud', 'Rechazado', new Date('2026-05-01')),
      documento('Certificado de Salud', 'Aprobado', new Date('2026-08-01')),
    ]);

    expect(version).toHaveLength(1);
    expect(version[0].estado).toBe('Aprobado');
  });

  it('no mezcla tipos de documento distintos', () => {
    const versiones = ultimaVersionPorTipo([
      documento('DNI', 'Aprobado'),
      documento('Título', 'Pendiente'),
    ]);

    expect(versiones).toHaveLength(2);
  });

  it('cruza por nombre normalizado, igual que calcularProgresoLegajo', () => {
    const version = ultimaVersionPorTipo([
      documento('apto fisico ', 'Pendiente', new Date('2026-05-01')),
      documento('Apto Físico', 'Aprobado', new Date('2026-08-01')),
    ]);

    expect(version).toHaveLength(1);
    expect(version[0].estado).toBe('Aprobado');
  });
});

describe('obligatoriosSinCargar', () => {
  it('devuelve los obligatorios del rol que nunca se subieron, en el orden del rol', () => {
    const faltan = obligatoriosSinCargar(
      [documento('Título', 'Aprobado')],
      [requerido('DNI'), requerido('Título'), requerido('CUIL')],
    );

    expect(faltan.map((r) => r.nombreDocumento)).toEqual(['DNI', 'CUIL']);
  });

  it('no cuenta los que no son obligatorios', () => {
    const faltan = obligatoriosSinCargar([], [requerido('DNI'), requerido('Curriculum', false)]);

    expect(faltan.map((r) => r.nombreDocumento)).toEqual(['DNI']);
  });

  it('un documento subido no falta, esté en el estado que esté', () => {
    // Rechazado o pendiente ya se ENTREGÓ: lo que corresponde ahí es corregirlo
    // o esperar la revisión, y eso lo avisan otras novedades.
    const faltan = obligatoriosSinCargar(
      [documento('DNI', 'Rechazado'), documento('CUIL', 'Pendiente')],
      [requerido('DNI'), requerido('CUIL')],
    );

    expect(faltan).toEqual([]);
  });

  it('compara el nombre sin mayúsculas ni tildes', () => {
    const faltan = obligatoriosSinCargar(
      [documento('titulo ', 'Pendiente')],
      [requerido('Título')],
    );

    expect(faltan).toEqual([]);
  });

  it('sin requeridos no inventa faltantes', () => {
    // Si no se sabe qué pide el instituto (falló el pedido, rol sin legajo),
    // no hay lista contra la cual decir que algo falta.
    expect(obligatoriosSinCargar([documento('DNI', 'Aprobado')], [])).toEqual([]);
  });
});

describe('requeridoDelDocumento', () => {
  it('encuentra el tipo de un documento del legajo por su nombre', () => {
    const requeridos = [requerido('DNI'), requerido('Apto médico')];

    expect(requeridoDelDocumento(documento('Apto médico', 'Aprobado'), requeridos)).toBe(
      requeridos[1],
    );
  });

  it('compara el nombre sin mayúsculas ni tildes', () => {
    const requeridos = [requerido('Apto médico')];

    expect(requeridoDelDocumento(documento('APTO MEDICO ', 'Aprobado'), requeridos)).toBe(
      requeridos[0],
    );
  });

  it('si el tipo no está entre los de su rol, no inventa uno', () => {
    expect(
      requeridoDelDocumento(documento('Curriculum', 'Aprobado'), [requerido('DNI')]),
    ).toBeNull();
  });
});
