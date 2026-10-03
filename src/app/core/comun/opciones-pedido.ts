/**
 * Opciones de DOMINIO que un pedido de datos puede aceptar.
 *
 * No hablan de HTTP a propósito: los servicios abstractos de `core/` son el
 * contrato y no tienen que saber cómo se traduce cada opción (Strategy + DIP).
 * Quien las traduce es cada `*-http.service.ts`; los `*-mock.service.ts` las
 * ignoran.
 */
export interface OpcionesPedido {
  /**
   * "Este pedido es accesorio: no bloquees la pantalla." Lo usa, por ejemplo,
   * la campana, que se refresca en todas las pantallas aunque no carguen nada
   * propio. Sin esto el pedido se comporta como siempre (con el velo global).
   */
  enSegundoPlano?: boolean;
}
