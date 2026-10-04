import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import { AdjuntoReconocimiento, SolicitudPendiente } from './modelos/solicitud-pendiente';
import {
  MENSAJE_ADJUNTO_NO_ENCONTRADO,
  MENSAJE_ERROR_ADJUNTO,
  MENSAJE_ERROR_RECONOCIMIENTO,
  MENSAJE_ERROR_SOLICITUDES,
  MENSAJE_RECONOCIMIENTO_ENVIADO,
  MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE,
  ReconocimientoSaberesService,
  SolicitudReconocimiento,
} from './reconocimiento-saberes.service';

/** Lo que devuelve `EnviarSolicitud` en un 200. En español: `mensaje`, no `message`. */
interface RespuestaSolicitudApi {
  mensaje?: string;
}

/** Cada fila de `recibirSolicitudReconocimiento`. `DNI` sale como `dni`. */
interface SolicitudPendienteApi {
  idSolicitud: number;
  alumnoNombreCompleto: string | null;
  dni: string | null;
  materiaSolicitada: string | null;
  comentario: string | null;
  urlProgramaPdf: string;
  urlAnaliticoPdf: string;
}

/**
 * `POST /api/ReconocimientoSaberes/solicitar` (multipart/form-data), y la
 * bandeja de Secretaría: `GET .../recibirSolicitudReconocimiento` y
 * `GET .../{id}/programa|analitico`.
 *
 * Los nombres de los campos son los de `SolicitudReconocimientoDto`; ASP.NET
 * no distingue mayúsculas al enlazar el formulario. Los errores del backend
 * llegan como texto suelto (`BadRequest("...")`), que `mensajeDelServidor`
 * ya sabe leer.
 */
@Injectable()
export class ReconocimientoSaberesHttpService extends ReconocimientoSaberesService {
  private readonly http = inject(HttpClient);

  enviar(solicitud: SolicitudReconocimiento): Observable<string> {
    const cuerpo = new FormData();
    cuerpo.append('idMateria', String(solicitud.idMateria));
    if (solicitud.comentario !== null) {
      cuerpo.append('comentario', solicitud.comentario);
    }
    cuerpo.append('programaPdf', solicitud.programaPdf);
    cuerpo.append('analiticoPdf', solicitud.analiticoPdf);

    // Sin `Content-Type` a propósito: el navegador lo pone solo, con el
    // `boundary` que necesita multipart. Ponerlo a mano rompe la subida.
    return this.http.post<RespuestaSolicitudApi>(RUTAS_API.solicitarReconocimiento, cuerpo).pipe(
      map((respuesta) => respuesta?.mensaje?.trim() || MENSAJE_RECONOCIMIENTO_ENVIADO),
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

  listarPendientes(): Observable<SolicitudPendiente[]> {
    return this.http.get<SolicitudPendienteApi[]>(RUTAS_API.reconocimientosPendientes).pipe(
      map((solicitudes) => (solicitudes ?? []).map(aSolicitudPendiente)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer las solicitudes de reconocimiento:', error);
        return throwError(() => new Error(MENSAJE_ERROR_SOLICITUDES));
      }),
    );
  }

  descargarAdjunto(idSolicitud: number, adjunto: AdjuntoReconocimiento): Observable<Blob> {
    const url = RUTAS_API.adjuntoReconocimiento(idSolicitud, adjunto);
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => {
        // Con `responseType: 'blob'` el cuerpo del error también es un Blob y
        // no se puede leer de forma sincrónica. El 404 tiene un solo motivo.
        if (error.status === 404) {
          return throwError(() => new Error(MENSAJE_ADJUNTO_NO_ENCONTRADO));
        }
        console.error('Error al descargar el adjunto de la solicitud:', error);
        return throwError(() => new Error(MENSAJE_ERROR_ADJUNTO));
      }),
    );
  }
}

function aSolicitudPendiente(solicitud: SolicitudPendienteApi): SolicitudPendiente {
  // El backend arma "Apellido, Nombre": con los dos vacíos llega ", ".
  const alumno = (solicitud.alumnoNombreCompleto ?? '').replace(/^[\s,]+|[\s,]+$/g, '');
  const comentario = solicitud.comentario?.trim() ?? '';
  return {
    idSolicitud: solicitud.idSolicitud,
    alumno: alumno || 'Alumno sin nombre cargado',
    dni: solicitud.dni ?? '',
    materia: solicitud.materiaSolicitada?.trim() || 'Materia sin nombre',
    comentario: comentario === '' ? null : comentario,
  };
}
