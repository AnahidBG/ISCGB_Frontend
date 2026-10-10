import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { contextoDePedido } from '../carga/contexto-pedido';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { desdeFechaSola } from '../comun/fechas';
import { RUTAS_API } from '../configuracion/api';
import { ExamenesService, MENSAJE_ERROR_CALENDARIO } from './examenes.service';
import { DiaOcupado, EstadoMes } from './modelos/estado-mes';

/** Un elemento de `diasOcupados`. La fecha es un `DateTime` de .NET: "2026-10-13T00:00:00". */
interface DiaOcupadoApi {
  fecha: string;
  cantidadExamenes: number;
  limiteAlcanzado: boolean;
}

/** El cuerpo del `GET .../estado-mes`. */
interface EstadoMesApi {
  limiteDiario: number;
  diasOcupados: DiaOcupadoApi[];
}

/** El calendario de exámenes contra la API real. */
@Injectable()
export class ExamenesHttpService extends ExamenesService {
  private readonly http = inject(HttpClient);

  estadoDelMes(anio: number, mes: number, opciones?: OpcionesPedido): Observable<EstadoMes> {
    return this.http
      .get<EstadoMesApi>(RUTAS_API.estadoMesCalendario(anio, mes), {
        context: contextoDePedido(opciones),
      })
      .pipe(
        map(aEstadoMes),
        catchError((error: unknown) => {
          console.error('Error al traer el estado del mes del calendario:', error);
          return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
        }),
      );
  }
}

/**
 * Adapter: la respuesta cruda → el modelo limpio. Una respuesta que no se
 * puede leer es un error: un calendario con días inventados es peor que
 * ninguno.
 */
function aEstadoMes(respuesta: EstadoMesApi): EstadoMes {
  const limiteDiario: unknown = respuesta?.limiteDiario;
  if (typeof limiteDiario !== 'number' || !Number.isFinite(limiteDiario)) {
    throw new Error('La respuesta no trae `limiteDiario`.');
  }
  if (!Array.isArray(respuesta.diasOcupados)) {
    throw new Error('La respuesta no trae `diasOcupados`.');
  }

  return { limiteDiario, diasOcupados: respuesta.diasOcupados.map(aDiaOcupado) };
}

function aDiaOcupado(dia: DiaOcupadoApi): DiaOcupado {
  // `desdeFechaSola` y no `new Date(texto)`: una fecha sin zona se leería en
  // UTC y en Argentina caería el día anterior.
  const fecha = desdeFechaSola(dia.fecha);
  if (fecha === null) {
    throw new Error(`La fecha "${dia.fecha}" no es válida.`);
  }

  return {
    fecha,
    cantidadExamenes: dia.cantidadExamenes,
    limiteAlcanzado: dia.limiteAlcanzado,
  };
}
