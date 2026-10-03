import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { esEndpointInexistente } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import { ContextoDocente } from './modelos/contexto-docente';
import { ProgramaMateria } from './modelos/programa-materia';
import {
  MENSAJE_CONTEXTO_NO_DISPONIBLE,
  MENSAJE_ERROR_CONTEXTO_DOCENTE,
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
 * El contexto devuelve `{ idDocente, materias }`, que es la forma que usa la
 * pantalla para identificar al docente y llenar el selector de materias.
 */
@Injectable()
export class ProgramasMateriaHttpService extends ProgramasMateriaService {
  private readonly http = inject(HttpClient);

  obtenerContextoDocente(idUsuario: number): Observable<ContextoDocente | null> {
    return this.http.get<ContextoDocente>(RUTAS_API.contextoDocente(idUsuario)).pipe(
      map((contexto) => ({
        idDocente: contexto.idDocente,
        // `materias` puede no venir si el backend serializa una lista vacía
        // como ausente; normalizarlo acá evita un `undefined` en el template.
        materias: (contexto.materias ?? []).map((materia) => ({
          idMateria: materia.idMateria,
          nombre: materia.nombre?.trim() || 'Materia sin nombre cargado',
          carrera: materia.carrera ?? null,
          curso: materia.curso ?? null,
          idComision: materia.idComision,
          nombreComision: materia.nombreComision?.trim() || `Comisión ${materia.idComision}`,
        })),
      })),
      catchError((error: HttpErrorResponse) => {
        // 404 SIN cuerpo = la ruta no existe en el backend.
        // No es "no sos docente": se dice lo que pasa de verdad.
        if (esEndpointInexistente(error)) {
          return throwError(() => new Error(MENSAJE_CONTEXTO_NO_DISPONIBLE));
        }
        // 404 CON cuerpo = el controlador respondió que este usuario no es
        // docente. No es un error de red: la pantalla lo explica. Ver el
        // contrato en `ProgramasMateriaService.obtenerContextoDocente`.
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error al traer el contexto del docente:', error);
        return throwError(() => new Error(MENSAJE_ERROR_CONTEXTO_DOCENTE));
      }),
    );
  }

  enviarPrograma(programa: ProgramaMateria): Observable<number> {
    return this.http.post<RespuestaCrearPrograma>(RUTAS_API.programasMateria, programa).pipe(
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
