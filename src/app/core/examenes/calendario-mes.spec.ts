import {
  DIAS_DE_LA_SEMANA,
  EstadoDia,
  estadoDelDia,
  etiquetaDelDia,
  leyendaDelCalendario,
  mesAnterior,
  mesDe,
  mesSiguiente,
  semanasDelMes,
  textoDelLimite,
  tituloDelMes,
} from './calendario-mes';
import { DiaOcupado } from './modelos/estado-mes';

/** Un día que el backend informa como ocupado: la fecha a medianoche, en hora local. */
function ocupado(
  anio: number,
  mes: number,
  dia: number,
  cantidadExamenes: number,
  limiteAlcanzado = false,
): DiaOcupado {
  return { fecha: new Date(anio, mes - 1, dia), cantidadExamenes, limiteAlcanzado };
}

describe('estadoDelDia', () => {
  it.each<[string, DiaOcupado | undefined, EstadoDia]>([
    ['que el backend no informa está', undefined, 'Libre'],
    ['con un examen y sin el límite alcanzado está', ocupado(2026, 10, 13, 1), 'ConExamenes'],
    ['con el límite alcanzado está', ocupado(2026, 10, 14, 2, true), 'Completo'],
    // El límite lo calcula el backend: no se recalcula con la cantidad.
    ['con 3 exámenes pero sin el límite marcado está', ocupado(2026, 10, 15, 3), 'ConExamenes'],
    [
      'con 1 examen y el límite marcado (límite de 1) está',
      ocupado(2026, 10, 16, 1, true),
      'Completo',
    ],
  ])('un día %s %s', (_caso, dia, esperado) => {
    expect(estadoDelDia(dia)).toBe(esperado);
  });
});

describe('semanasDelMes', () => {
  const HOY = new Date(2026, 9, 10);

  it('la semana va de lunes a domingo, con los nombres de las columnas en ese orden', () => {
    expect(DIAS_DE_LA_SEMANA.map((dia) => dia.corto)).toEqual([
      'Lun',
      'Mar',
      'Mié',
      'Jue',
      'Vie',
      'Sáb',
      'Dom',
    ]);
    expect(
      semanasDelMes({ anio: 2026, mes: 10 }, [], HOY)[0].map((dia) => dia.fecha.getDay()),
    ).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it.each([
    ['febrero de 2027, que arranca lunes y tiene 28 días,', 2027, 2, 4],
    ['junio de 2026, que arranca lunes,', 2026, 6, 5],
    ['agosto de 2026, que arranca sábado y tiene 31 días,', 2026, 8, 6],
  ])('%s ocupa %i semanas de siete días', (_caso, anio, mes, semanasEsperadas) => {
    const semanas = semanasDelMes({ anio, mes }, [], HOY);

    expect(semanas).toHaveLength(semanasEsperadas);
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
  });

  it('un mes que arranca en lunes no lleva relleno al principio y cierra con el mes siguiente', () => {
    const dias = semanasDelMes({ anio: 2026, mes: 6 }, [], HOY).flat();

    expect(dias[0]).toMatchObject({ numero: 1, delMes: true });
    expect(dias.filter((dia) => dia.delMes)).toHaveLength(30);
    // 5 de julio: sin estado, porque el mes de relleno no se pidió.
    expect(dias.at(-1)).toMatchObject({ numero: 5, delMes: false, estado: null, cantidad: 0 });
    expect(dias.at(-1)?.fecha.getMonth()).toBe(6);
  });

  it('un mes que arranca en sábado abre con los últimos días del anterior y usa 6 semanas', () => {
    const dias = semanasDelMes({ anio: 2026, mes: 8 }, [], HOY).flat();

    expect(dias.slice(0, 5).map((dia) => dia.numero)).toEqual([27, 28, 29, 30, 31]);
    expect(dias.slice(0, 5).every((dia) => !dia.delMes)).toBe(true);
    expect(dias[5]).toMatchObject({ numero: 1, delMes: true });
    expect(dias.at(-1)).toMatchObject({ numero: 6, delMes: false });
  });

  it('cada día ocupado cae en su celda con su estado y su cantidad, y los demás quedan libres', () => {
    const dias = semanasDelMes(
      { anio: 2026, mes: 10 },
      [ocupado(2026, 10, 13, 1), ocupado(2026, 10, 20, 2, true)],
      HOY,
    ).flat();
    const delMes = (numero: number) => dias.find((dia) => dia.delMes && dia.numero === numero);

    expect(delMes(13)).toMatchObject({ estado: 'ConExamenes', cantidad: 1 });
    expect(delMes(20)).toMatchObject({ estado: 'Completo', cantidad: 2 });
    expect(delMes(14)).toMatchObject({ estado: 'Libre', cantidad: 0 });
  });

  it.each([
    ['dentro del mes', new Date(2026, 9, 10, 18, 30), 10, true],
    ['de relleno', new Date(2026, 10, 1), 1, false],
  ])(
    'marca hoy aunque sea un día %s, y compara solo el día, no la hora',
    (_caso, hoy, numero, delMes) => {
      const marcados = semanasDelMes({ anio: 2026, mes: 10 }, [], hoy)
        .flat()
        .filter((dia) => dia.esHoy);

      expect(marcados).toHaveLength(1);
      expect(marcados[0]).toMatchObject({ numero, delMes });
    },
  );
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
  ])('el título de %o es "%s"', (mes, titulo) => {
    expect(tituloDelMes(mes)).toBe(titulo);
  });
});

describe('textos del calendario', () => {
  it.each<[EstadoDia, number, string]>([
    ['Libre', 0, 'Libre'],
    ['ConExamenes', 1, '1 examen'],
    ['ConExamenes', 3, '3 exámenes'],
    ['Completo', 2, 'Completo'],
  ])('un día %s con %i exámenes dice "%s"', (estado, cantidad, etiqueta) => {
    expect(etiquetaDelDia(estado, cantidad)).toBe(etiqueta);
  });

  it.each([
    [1, ['Libre', 'Completo']],
    [2, ['Libre', '1 examen', 'Completo']],
    [3, ['Libre', 'Con exámenes', 'Completo']],
  ])('con un límite de %i por día, la leyenda dice %j', (limite, etiquetas) => {
    expect(leyendaDelCalendario(limite).map((item) => item.etiqueta)).toEqual(etiquetas);
  });

  it('la leyenda lleva los estados en orden, para que el chip tenga el color de su estado', () => {
    expect(leyendaDelCalendario(2).map((item) => item.estado)).toEqual([
      'Libre',
      'ConExamenes',
      'Completo',
    ]);
  });

  it.each([
    [1, 'el límite de 1 examen por día'],
    [2, 'el límite de 2 exámenes por día'],
  ])('el texto de ayuda con un límite de %i habla de "%s"', (limite, fragmento) => {
    expect(textoDelLimite(limite)).toContain(fragmento);
    expect(textoDelLimite(limite)).toContain('Secretaría Académica');
  });
});
