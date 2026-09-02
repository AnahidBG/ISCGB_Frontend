import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import { ContextoDocente } from './modelos/contexto-docente';
import { ProgramaMateria } from './modelos/programa-materia';
import {
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
        })),
      })),
      catchError((error: HttpErrorResponse) => {
        // 404 = este usuario no es docente. No es un error de red: la
        // pantalla lo explica con todas las letras. Ver el contrato en
        // `ProgramasMateriaService.obtenerContextoDocente`.
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error al traer el contexto del docente:', error);
        return throwError(() => new Error(MENSAJE_ERROR_CONTEXTO_DOCENTE));
      }),
    );
  }

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
