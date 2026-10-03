import { HttpContext } from '@angular/common/http';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { SIN_CARGA_GLOBAL } from './carga.interceptor';

/**
 * Adapter: traduce una opción de dominio (`OpcionesPedido`) al `HttpContext`
 * que entiende `cargaInterceptor`. Solo lo usan los `*-http.service.ts`: es
 * el único lugar donde "en segundo plano" se vuelve `SIN_CARGA_GLOBAL`.
 *
 * Sin la opción el contexto queda vacío y el pedido pasa por el velo global
 * como siempre.
 */
export function contextoDePedido(opciones?: OpcionesPedido): HttpContext {
  return new HttpContext().set(SIN_CARGA_GLOBAL, opciones?.enSegundoPlano === true);
}
