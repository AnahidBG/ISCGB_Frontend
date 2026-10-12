import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import {
  CeldaGrilla,
  descripcionDelDia,
  etiquetaDelDia,
  leyendaDelCalendario,
  mesAnterior,
  mesDe,
  mesSiguiente,
  semanasDelMes,
  textoDelLimite,
  textoDeParciales,
  tituloDelMes,
} from './calendario-mes';
import { DiaCalendario, EstadoDiaCalendario } from './modelos/dia-calendario';
import { PERIODO_DEL_LIMITE } from './periodo-limite';

registerLocaleData(localeEsAr);

/** Un día del backend ya adaptado: `fecha` es "yyyy-MM-dd". */
function dia(
  fecha: string,
  cantidad: number,
  estado: EstadoDiaCalendario,
  limite = 2,
): DiaCalendario {
  return { fecha, cantidad, limite, estado };
}

describe('semanasDelMes', () => {
  const HOY = new Date(2026, 9, 10);

  it('la semana va de lunes a domingo', () => {
    const primera = semanasDelMes({ anio: 2026, mes: 10 }, [], HOY)[0];

    expect(primera.map((celda) => new Date(`${celda.fecha}T00:00:00`).getDay())).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
  });

  it.each([
    ['febrero de 2027, que arranca lunes y tiene 28 días,', 4, 2027, 2],
    ['junio de 2026, que arranca lunes,', 5, 2026, 6],
    ['agosto de 2026, que arranca sábado y tiene 31 días,', 6, 2026, 8],
    ['febrero de 2026, que arranca domingo,', 5, 2026, 2],
    ['marzo de 2026, que arranca domingo y tiene 31 días,', 6, 2026, 3],
    ['febrero de 2028, que es bisiesto,', 5, 2028, 2],
  ])('%s ocupa %i semanas de siete días', (_caso, semanasEsperadas, anio, mes) => {
    const semanas = semanasDelMes({ anio, mes }, [], HOY);

    expect(semanas).toHaveLength(semanasEsperadas);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
  });

  it('un mes que arranca en domingo abre con seis días del anterior y cierra con uno del siguiente', () => {
    const celdas = semanasDelMes({ anio: 2026, mes: 2 }, [], HOY).flat();

    // El 1 de febrero de 2026 es domingo: el lunes a sábado anteriores son de enero.
    expect(celdas.slice(0, 6).map((celda) => [celda.fecha, celda.delMes])).toEqual([
      ['2026-01-26', false],
      ['2026-01-27', false],
      ['2026-01-28', false],
      ['2026-01-29', false],
      ['2026-01-30', false],
      ['2026-01-31', false],
    ]);
    expect(celdas[6]).toMatchObject({ fecha: '2026-02-01', numero: 1, delMes: true });
    expect(celdas.filter((celda) => celda.delMes)).toHaveLength(28);
    expect(celdas.at(-1)).toMatchObject({ fecha: '2026-03-01', numero: 1, delMes: false });
  });

  it('febrero bisiesto tiene un 29 y el de un año común no', () => {
    const delMes = (anio: number) =>
      semanasDelMes({ anio, mes: 2 }, [], HOY)
        .flat()
        .filter((celda) => celda.delMes)
        .map((celda) => celda.numero);

    expect(delMes(2028)).toHaveLength(29);
    expect(delMes(2028).at(-1)).toBe(29);
    expect(delMes(2027)).toHaveLength(28);
  });

  it('un mes que arranca en lunes no lleva relleno al principio y cierra con el mes siguiente', () => {
    const celdas = semanasDelMes({ anio: 2026, mes: 6 }, [], HOY).flat();

    expect(celdas[0]).toMatchObject({ numero: 1, delMes: true });
    expect(celdas.filter((celda) => celda.delMes)).toHaveLength(30);
    // 5 de julio: sin datos, porque el mes de relleno no se pidió.
    expect(celdas.at(-1)).toMatchObject({ fecha: '2026-07-05', delMes: false, dia: null });
  });

  it('cada día con datos cae en su celda, y los de relleno no llevan datos', () => {
    const celdas = semanasDelMes(
      { anio: 2026, mes: 10 },
      [dia('2026-10-13', 1, 'ocupado'), dia('2026-10-20', 2, 'completo')],
      HOY,
    ).flat();
    const delMes = (numero: number) =>
      celdas.find((celda) => celda.delMes && celda.numero === numero);

    expect(delMes(13)?.dia).toEqual(dia('2026-10-13', 1, 'ocupado'));
    expect(delMes(20)?.dia?.estado).toBe('completo');
    expect(delMes(14)?.dia).toBeNull();
    expect(celdas.filter((celda) => !celda.delMes).every((celda) => celda.dia === null)).toBe(true);
  });

  it.each([
    ['dentro del mes', new Date(2026, 9, 10, 18, 30), '2026-10-10', true],
    ['de relleno', new Date(2026, 10, 1), '2026-11-01', false],
  ])(
    'marca hoy aunque sea un día %s, y compara solo el día, no la hora',
    (_caso, hoy, fecha, delMes) => {
      const marcados = semanasDelMes({ anio: 2026, mes: 10 }, [], hoy)
        .flat()
        .filter((celda) => celda.esHoy);

      expect(marcados).toHaveLength(1);
      expect(marcados[0]).toMatchObject({ fecha, delMes });
    },
  );

  it('los días pasados y los completos no se pueden elegir; hoy y los que vienen, sí', () => {
    const celdas = semanasDelMes(
      { anio: 2026, mes: 10 },
      [dia('2026-10-20', 2, 'completo'), dia('2026-10-21', 1, 'ocupado')],
      HOY,
    ).flat();
    const celda = (fecha: string): CeldaGrilla => celdas.find((c) => c.fecha === fecha)!;

    expect(celda('2026-10-09')).toMatchObject({ esPasado: true, elegible: false });
    expect(celda('2026-10-10')).toMatchObject({ esPasado: false, elegible: true });
    expect(celda('2026-10-20')).toMatchObject({ elegible: false });
    expect(celda('2026-10-21')).toMatchObject({ elegible: true });
    // Los de relleno son de otro mes: tampoco se eligen.
    expect(celdas.filter((c) => !c.delMes).every((c) => !c.elegible)).toBe(true);
  });
});

describe('cambio de mes', () => {
  it.each([
    [
      { anio: 2026, mes: 10 },
      { anio: 2026, mes: 9 },
      { anio: 2026, mes: 11 },
    ],
    [
      { anio: 2026, mes: 1 },
      { anio: 2025, mes: 12 },
      { anio: 2026, mes: 2 },
    ],
    [
      { anio: 2026, mes: 12 },
      { anio: 2026, mes: 11 },
      { anio: 2027, mes: 1 },
    ],
  ])('desde %o el mes anterior es %o y el siguiente es %o', (mes, anterior, siguiente) => {
    expect(mesAnterior(mes)).toEqual(anterior);
    expect(mesSiguiente(mes)).toEqual(siguiente);
  });

  it('el mes de una fecha usa el mes del calendario, de 1 a 12', () => {
    expect(mesDe(new Date(2026, 11, 31, 23, 59))).toEqual({ anio: 2026, mes: 12 });
    expect(mesDe(new Date(2027, 0, 1))).toEqual({ anio: 2027, mes: 1 });
  });

  it.each([
    [{ anio: 2026, mes: 1 }, 'Enero 2026'],
    [{ anio: 2026, mes: 10 }, 'Octubre 2026'],
    [{ anio: 2027, mes: 9 }, 'Septiembre 2027'],
  ])('el título de %o es "%s", con el mes en español y la inicial en mayúscula', (mes, titulo) => {
    expect(tituloDelMes(mes, 'es-AR')).toBe(titulo);
  });
});

describe('textos del calendario', () => {
  it.each<[number, string]>([
    [0, '0 parciales'],
    [1, '1 parcial'],
    [3, '3 parciales'],
  ])('%i parciales se dicen "%s"', (cantidad, texto) => {
    expect(textoDeParciales(cantidad)).toBe(texto);
  });

  it.each<[EstadoDiaCalendario, number, string]>([
    ['disponible', 0, 'Libre'],
    ['ocupado', 1, '1 parcial'],
    ['ocupado', 3, '3 parciales'],
    ['completo', 2, 'Completo'],
  ])('un día %s con %i parciales dice "%s"', (estado, cantidad, etiqueta) => {
    expect(etiquetaDelDia(estado, cantidad)).toBe(etiqueta);
  });

  it.each([
    [1, ['Libre', 'Completo']],
    [2, ['Libre', '1 parcial', 'Completo']],
    [3, ['Libre', 'Con parciales', 'Completo']],
  ])('con un límite de %i, la leyenda dice %j', (limite, etiquetas) => {
    expect(leyendaDelCalendario(limite).map((item) => item.etiqueta)).toEqual(etiquetas);
  });

  it('la leyenda lleva los estados en orden, para que el chip tenga el color de su estado', () => {
    expect(leyendaDelCalendario(2).map((item) => item.estado)).toEqual([
      'disponible',
      'ocupado',
      'completo',
    ]);
  });

  it.each([
    [1, 'el límite de 1 parcial'],
    [2, 'el límite de 2 parciales'],
  ])('la nota del límite con %i habla de "%s" y nombra el período', (limite, fragmento) => {
    const texto = textoDelLimite(limite);

    expect(texto).toContain(fragmento);
    expect(texto).toContain(`por ${PERIODO_DEL_LIMITE}`);
    expect(texto).toContain('Secretaría Académica');
  });
});

describe('descripcionDelDia', () => {
  const HOY = new Date(2026, 9, 10);
  const celdaDe = (fecha: string, dias: DiaCalendario[]) =>
    semanasDelMes({ anio: 2026, mes: 10 }, dias, HOY)
      .flat()
      .find((celda) => celda.fecha === fecha)!;

  it.each<[string, string, DiaCalendario[], string]>([
    [
      'un día con un parcial',
      '2026-10-15',
      [dia('2026-10-15', 1, 'ocupado')],
      '15 de octubre, 1 de 2 parciales',
    ],
    [
      'un día sin parciales',
      '2026-10-16',
      [dia('2026-10-16', 0, 'disponible')],
      '16 de octubre, 0 de 2 parciales',
    ],
    [
      'un día completo',
      '2026-10-20',
      [dia('2026-10-20', 2, 'completo')],
      '20 de octubre, 2 de 2 parciales, completo',
    ],
    [
      'un día pasado',
      '2026-10-05',
      [dia('2026-10-05', 1, 'ocupado')],
      '5 de octubre, 1 de 2 parciales, fecha pasada',
    ],
    [
      'un día pasado y completo',
      '2026-10-06',
      [dia('2026-10-06', 2, 'completo')],
      '6 de octubre, 2 de 2 parciales, completo, fecha pasada',
    ],
    [
      'un límite de uno',
      '2026-10-22',
      [dia('2026-10-22', 1, 'completo', 1)],
      '22 de octubre, 1 de 1 parcial, completo',
    ],
    ['un día sin datos', '2026-10-25', [], '25 de octubre'],
  ])('describe %s', (_caso, fecha, dias, descripcion) => {
    expect(descripcionDelDia(celdaDe(fecha, dias), 'es-AR')).toBe(descripcion);
  });
});
