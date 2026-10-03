import { SIN_CARGA_GLOBAL } from './carga.interceptor';
import { contextoDePedido } from './contexto-pedido';

describe('contextoDePedido', () => {
  it('en segundo plano marca el pedido para que no dispare el velo global', () => {
    expect(contextoDePedido({ enSegundoPlano: true }).get(SIN_CARGA_GLOBAL)).toBe(true);
  });

  it.each([undefined, {}, { enSegundoPlano: false }])(
    'sin pedirlo (%j) el pedido sigue pasando por el velo global',
    (opciones) => {
      expect(contextoDePedido(opciones).get(SIN_CARGA_GLOBAL)).toBe(false);
    },
  );
});
