import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';
import { calcularProgresoLegajo } from './progreso-legajo';

function documento(nombre: string, estado: string | null): DocumentoLegajo {
  return {
    id: Math.random(),
    nombre,
    estado,
    fechaSubida: new Date('2026-08-01'),
    comentario: null,
    fechaVencimiento: null,
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
