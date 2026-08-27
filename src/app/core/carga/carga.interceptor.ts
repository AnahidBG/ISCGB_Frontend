import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { CargaService } from './carga.service';

/**
 * Marca una llamada para que NO dispare el loader global.
 *
 * Se usa cuando la espera pasa adentro de una caja y ya tiene su propio
 * loader local — el historial de un panel lateral, una tabla que se refresca,
 * un autocompletado. Sin esto, abrir un panel lateral taparía la pantalla
 * entera, que es exactamente lo que no queremos.
 *
 *   this.http.get(url, {
 *     context: new HttpContext().set(SIN_CARGA_GLOBAL, true),
 *   })
 */
export const SIN_CARGA_GLOBAL = new HttpContextToken<boolean>(() => false);

/**
 * Muestra el loader global mientras haya llamadas HTTP en curso.
 *
 * El `finalize` es lo que garantiza que el contador baje SIEMPRE: con éxito,
 * con error, o si alguien cancela la suscripción. Si se usara solo el camino
 * feliz (`tap` del `next`), un 500 dejaría el loader pegado en pantalla para
 * siempre — es el bug clásico de este patrón.
 */
export const cargaInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  if (peticion.context.get(SIN_CARGA_GLOBAL)) {
    return siguiente(peticion);
  }

  const carga = inject(CargaService);
  carga.mostrar();

  return siguiente(peticion).pipe(finalize(() => carga.ocultar()));
};
