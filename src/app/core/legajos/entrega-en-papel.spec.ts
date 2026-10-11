import { veredictoGuardado } from './entrega-en-papel';

describe('veredictoGuardado', () => {
  it.each(['Aprobado', 'Rechazado'] as const)('"%s" ya es un veredicto: se reenvía tal cual', (estado) => {
    expect(veredictoGuardado(estado)).toBe(estado);
  });

  it.each(['Pendiente', 'En trámite', null])('%s todavía no tiene veredicto', (estado) => {
    expect(veredictoGuardado(estado)).toBeNull();
  });
});
