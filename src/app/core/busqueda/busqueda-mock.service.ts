import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { normalizarTexto } from '../comun/texto';
import { BusquedaService, LARGO_MINIMO_BUSQUEDA } from './busqueda.service';
import { ResultadoBusqueda } from './modelos/resultado-busqueda';

/** Un poco de todo para maquetar sin backend. Los ids no son los de la base. */
const RESULTADOS_DE_EJEMPLO: readonly ResultadoBusqueda[] = [
  { tipo: 'persona', titulo: 'Dolores Docente', detalle: 'Legajo/DNI: 11111111', idReferencia: 1 },
  { tipo: 'persona', titulo: 'Alberto Alumno', detalle: 'Legajo/DNI: 22222222', idReferencia: 2 },
  { tipo: 'materia', titulo: 'Didáctica General', detalle: null, idReferencia: 1 },
  { tipo: 'justificativo', titulo: 'Enfermedad', detalle: 'Estado: Pendiente', idReferencia: 1 },
];

@Injectable()
export class BusquedaMockService extends BusquedaService {
  buscar(termino: string): Observable<ResultadoBusqueda[]> {
    const buscado = normalizarTexto(termino.trim());
    if (buscado.length < LARGO_MINIMO_BUSQUEDA) {
      return of([]);
    }
    const encontrados = RESULTADOS_DE_EJEMPLO.filter((r) =>
      normalizarTexto(r.titulo).includes(buscado),
    );
    return of(encontrados).pipe(delay(300));
  }
}
