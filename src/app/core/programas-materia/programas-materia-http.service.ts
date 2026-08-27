import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import { ProgramaMateria } from './modelos/programa-materia';
import {
  MENSAJE_ERROR_ENVIO_PROGRAMA,
  MENSAJE_ERROR_PDF_PROGRAMA,
  ProgramasMateriaService,
} from './programas-materia.service';

/**
 * Lo que devuelve `POST /api/ProgramasMateria` cuando el guardado sale bien.
 *
 * El `message` es para humanos y no lo mostramos: el frontend arma su propio
 * texto. El `idPrograma` es lo único que nos importa de acá.
 */
interface RespuestaCrearPrograma {
  message: string;
  idPrograma: number;
}

/**
 * Envío real del programa de materia contra la API de ISCGB.
 *
 * Cubre los dos endpoints del backend:
 *
 *   · `POST /api/ProgramasMateria`            → guarda y devuelve el id
 *   · `GET  /api/ProgramasMateria/{id}/pdf`   → devuelve el archivo
 *
 * ⚠️ Pendiente cuando el backend cierre los huecos conocidos:
 *   · Los dos endpoints están hoy sin `[Authorize]`, así que no mandamos
 *     token. Cuando lo pidan, el header va en un interceptor, no acá.
 *   · El `POST` devuelve 200 con un mensaje plano y no distingue errores de
 *     validación campo por campo. Mientras siga así, ante un 400 solo
 *     podemos mostrar un mensaje genérico.
 */
@Injectable()
export class ProgramasMateriaHttpService extends ProgramasMateriaService {
  private readonly http = inject(HttpClient);

  enviarPrograma(programa: ProgramaMateria): Observable<number> {
    return this.http
      .post<RespuestaCrearPrograma>(RUTAS_API.programasMateria, programa)
      .pipe(
        map((respuesta) => respuesta.idPrograma),
        catchError((error: HttpErrorResponse) => {
          console.error('Error al enviar el programa de materia:', error);
          return throwError(() => new Error(MENSAJE_ERROR_ENVIO_PROGRAMA));
        }),
      );
  }

  descargarPdf(idPrograma: number): Observable<Blob> {
    return this.http
      .get(RUTAS_API.pdfPrograma(idPrograma), {
        // El backend responde `application/pdf`. Sin esto Angular intenta
        // parsear los bytes del archivo como JSON y falla siempre.
        responseType: 'blob',
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error al descargar el PDF del programa:', error);
          return throwError(() => new Error(MENSAJE_ERROR_PDF_PROGRAMA));
        }),
      );
  }
}
