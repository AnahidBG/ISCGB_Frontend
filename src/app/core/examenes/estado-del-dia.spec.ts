import { EstadoDiaCalendario } from './modelos/dia-calendario';
import { estadoDelDia } from './estado-del-dia';

describe('estadoDelDia', () => {
  it.each<[string, unknown, unknown, EstadoDiaCalendario]>([
    ['sin parciales', 0, 2, 'disponible'],
    ['con uno de dos', 1, 2, 'ocupado'],
    ['con el límite menos uno', 4, 5, 'ocupado'],
    ['con el límite justo', 2, 2, 'completo'],
    ['con un límite de 1 y un parcial', 1, 1, 'completo'],
    ['por encima del límite', 3, 2, 'completo'],
  ])('un día %s (%s de %s) está %s', (_caso, cantidad, limite, esperado) => {
    expect(estadoDelDia(cantidad, limite)).toBe(esperado);
  });

  it.each<[string, unknown, unknown]>([
    ['una cantidad nula', null, 2],
    ['una cantidad que no está', undefined, 2],
    ['una cantidad que es texto', '1', 2],
    ['una cantidad que no es un número', Number.NaN, 2],
    ['una cantidad negativa', -1, 2],
    ['una cantidad con decimales', 1.5, 2],
    ['un límite nulo', 1, null],
    ['un límite que no es un número', 1, Number.NaN],
    ['un límite infinito', 1, Number.POSITIVE_INFINITY],
    ['un límite en cero', 1, 0],
    ['un límite negativo', 3, -2],
  ])('con %s el día se muestra disponible', (_caso, cantidad, limite) => {
    expect(estadoDelDia(cantidad, limite)).toBe('disponible');
  });
});
