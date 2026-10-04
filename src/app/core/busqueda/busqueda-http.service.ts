import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import { BusquedaService, LARGO_MINIMO_BUSQUEDA, MENSAJE_ERROR_BUSQUEDA } from './busqueda.service';
import { ResultadoBusqueda, TipoResultado } from './modelos/resultado-busqueda';

/** Forma real de `GET /api/Buscador/global` (`ResultadoBusquedaDto`). */
interface RespuestaBusquedaApi {
  cantidad?: number;
  data?: {
    tipo: string;
    titulo: string | null;
    subtitulo: string | null;
    idReferencia: number;
  }[];
}

/**
 * Cómo se traduce cada `tipo` del backend. Un tipo que no está acá se
 * descarta: no se sabe a dónde lleva, y un resultado sin destino confunde
 * más de lo que ayuda.
 *
 * `conDetalle: false` para las materias: el backend les pone siempre
 * "Materia del sistema", que no dice nada que el grupo no diga ya.
 */
const TIPO_POR_API: Readonly<Record<string, { tipo: TipoResultado; conDetalle: boolean }>> = {
  Docente: { tipo: 'persona', conDetalle: true },
  Materia: { tipo: 'materia', conDetalle: false },
  Documento: { tipo: 'justificativo', conDetalle: true },
};

@Injectable()
export class BusquedaHttpService extends BusquedaService {
  private readonly http = inject(HttpClient);

  buscar(termino: string): Observable<ResultadoBusqueda[]> {
    const limpio = termino.trim();
    if (limpio.length < LARGO_MINIMO_BUSQUEDA) {
      return of([]);
    }

    return this.http.get<RespuestaBusquedaApi>(RUTAS_API.busquedaGlobal(limpio)).pipe(
      map((respuesta) =>
        (respuesta?.data ?? []).flatMap((fila): ResultadoBusqueda[] => {
          const traduccion = TIPO_POR_API[fila.tipo];
          if (traduccion === undefined) {
            return [];
          }
          const detalle = fila.subtitulo?.trim() ?? '';
          return [
            {
              tipo: traduccion.tipo,
              titulo: fila.titulo?.trim() || 'Sin nombre',
              detalle: traduccion.conDetalle && detalle !== '' ? detalle : null,
              idReferencia: fila.idReferencia,
            },
          ];
        }),
      ),
      catchError((error: HttpErrorResponse) => {
        console.error('Error en la búsqueda:', error);
        return throwError(() => new Error(MENSAJE_ERROR_BUSQUEDA));
      }),
    );
  }
}
