import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { NuevaSuplencia, ResultadoSuplencia } from './modelos/suplencia';
import { SuplenciasService } from './suplencias.service';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/**
 * Los docentes que existen en el mock: los mismos ids que `MateriasMockService`.
 * El 1 solo es Docente, así que la baja le desactiva la cuenta; el 2 tiene otro
 * rol y la conserva.
 */
const SOLO_DOCENTE = new Map([
  [1, true],
  [2, false],
]);

/**
 * Las suplencias, en memoria.
 *
 * No se usa: `app.config.ts` provee `SuplenciasHttpService`. Queda para seguir
 * trabajando en la pantalla con el backend caído, cambiando una línea. Respeta
 * el texto del 404 de `DocenteController`.
 */
@Injectable()
export class SuplenciasMockService extends SuplenciasService {
  asignar(suplencia: NuevaSuplencia): Observable<ResultadoSuplencia> {
    if (!SOLO_DOCENTE.has(suplencia.idDocente)) {
      return this.noExiste();
    }
    return of({ esSuplente: true, cuentaActiva: true }).pipe(delay(DEMORA_SIMULADA_MS));
  }

  darDeBaja(idDocente: number): Observable<ResultadoSuplencia> {
    const soloDocente = SOLO_DOCENTE.get(idDocente);
    if (soloDocente === undefined) {
      return this.noExiste();
    }
    return of({ esSuplente: false, cuentaActiva: !soloDocente }).pipe(delay(DEMORA_SIMULADA_MS));
  }

  private noExiste(): Observable<never> {
    return throwError(() => new Error('No se encontró el registro del docente.'));
  }
}
