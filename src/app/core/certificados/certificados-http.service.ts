import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import {
  CertificadosService,
  MENSAJE_DATOS_INCOMPLETOS,
  MENSAJE_ERROR_CERTIFICADO,
  MENSAJE_NO_ES_ALUMNO,
  VarianteCertificado,
} from './certificados.service';

/**
 * Certificados contra la API real:
 *
 *   · `GET /api/Certificados/alumno-regular`
 *   · `GET /api/Certificados/alumno-regular-horario`
 *
 * Los dos responden `application/pdf`. Sin `responseType: 'blob'` Angular
 * intenta leer los bytes del PDF como JSON y falla siempre.
 */
@Injectable()
export class CertificadosHttpService extends CertificadosService {
  private readonly http = inject(HttpClient);

  descargar(variante: VarianteCertificado): Observable<Blob> {
    const url =
      variante === 'regular'
        ? RUTAS_API.certificadoAlumnoRegular
        : RUTAS_API.certificadoAlumnoRegularConHorario;

    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => {
        // Con `responseType: 'blob'` el cuerpo del error TAMBIÉN llega como
        // Blob, así que el `message` del backend no se puede leer de forma
        // sincrónica. Alcanza con el código: cada uno tiene un solo motivo
        // en `CertificadosController`.
        if (error.status === 400) {
          return throwError(() => new Error(MENSAJE_DATOS_INCOMPLETOS));
        }
        if (error.status === 404) {
          return throwError(() => new Error(MENSAJE_NO_ES_ALUMNO));
        }
        console.error('Error al generar el certificado:', error);
        return throwError(() => new Error(MENSAJE_ERROR_CERTIFICADO));
      }),
    );
  }
}
