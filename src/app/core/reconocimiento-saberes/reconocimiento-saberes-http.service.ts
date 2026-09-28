import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import {
  MENSAJE_ERROR_RECONOCIMIENTO,
  MENSAJE_RECONOCIMIENTO_ENVIADO,
  MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE,
  ReconocimientoSaberesService,
  SolicitudReconocimiento,
} from './reconocimiento-saberes.service';

/**
 * `POST /api/ReconocimientoSaberes` (multipart/form-data).
 *
 * ⚠️ El endpoint NO EXISTE todavía. El contrato propuesto — nombres de los
 * campos, qué responde — está en docs/contrato-reconocimiento-saberes.md,
 * con el mismo criterio de Justificativos (que ya funciona): archivos por
 * multipart, renombrado `ISCGB_NombreyApellido_NombreDocumento` y
 * validación por contenido del lado del servidor.
 */
@Injectable()
export class ReconocimientoSaberesHttpService extends ReconocimientoSaberesService {
  private readonly http = inject(HttpClient);

  enviar(solicitud: SolicitudReconocimiento): Observable<string> {
    const cuerpo = new FormData();
    cuerpo.append('idUsuario', String(solicitud.idUsuario));
    cuerpo.append('materiaIscgb', solicitud.materiaIscgb);
    if (solicitud.comentario !== null) {
      cuerpo.append('comentario', solicitud.comentario);
    }
    cuerpo.append('programaOtraInstitucion', solicitud.programaOtraInstitucion);
    cuerpo.append('analitico', solicitud.analitico);

    // Sin `Content-Type` a propósito: el navegador lo pone solo, con el
    // `boundary` que necesita multipart. Ponerlo a mano rompe la subida.
    return this.http.post<{ message?: string }>(RUTAS_API.reconocimientoSaberes, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || MENSAJE_RECONOCIMIENTO_ENVIADO),
      catchError((error: HttpErrorResponse) => {
        if (esEndpointInexistente(error)) {
          return throwError(() => new Error(MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE));
        }
        const motivo = error.status === 400 ? mensajeDelServidor(error) : null;
        console.error('Error al enviar la solicitud de reconocimiento:', error);
        return throwError(() => new Error(motivo ?? MENSAJE_ERROR_RECONOCIMIENTO));
      }),
    );
  }
}
