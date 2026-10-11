import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { contextoDePedido } from '../carga/contexto-pedido';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { desdeFechaSola } from '../comun/fechas';
import { RUTAS_API } from '../configuracion/api';
import { mesDe } from './calendario-mes';
import {
  ExamenesService,
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
  MENSAJE_ERROR_LIMITE_DIARIO,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
} from './examenes.service';
import { DiaOcupado, EstadoMes } from './modelos/estado-mes';
import { MesaAsignada } from './modelos/mesa-asignada';

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

/** El cuerpo del `PUT .../limite-parciales` (`ActualizarLimiteParcialesDto`). */
interface LimiteApi {
  nuevoLimite: number;
}

/** Un elemento del `GET .../mis-notificaciones`. */
interface MesaAsignadaApi {
  idExamen: number;
  materia: string;
  /** Un `DateTime` de .NET, con hora y sin zona: "2026-11-20T09:00:00". */
  fecha: string;
  /** "Ha sido asignado a la mesa de…": no se usa, el texto lo redacta el front. */
  mensaje: string;
}

/** Una fecha CON hora: "2026-11-20T09:00:00". */
const TEXTO_FECHA_Y_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

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

  /**
   * El backend no tiene un GET propio para el límite: viaja en `limiteDiario`
   * de `estado-mes`, y es el mismo en cualquier mes. Se pide el actual.
   */
  limiteDiario(): Observable<number> {
    const { anio, mes } = mesDe(new Date());

    return this.estadoDelMes(anio, mes).pipe(
      map((estado) => estado.limiteDiario),
      // `estadoDelMes` ya dejó el detalle en la consola; acá solo se cambia el
      // texto, que habla del calendario y no del límite.
      catchError(() => throwError(() => new Error(MENSAJE_ERROR_LIMITE_DIARIO))),
    );
  }

  guardarLimiteDiario(limite: number): Observable<void> {
    // Siempre un entero: con `nuevoLimite` ausente o `null` el backend lo da por
    // válido y deja el límite sin valor.
    const cuerpo: LimiteApi = { nuevoLimite: limite };

    return this.http.put(RUTAS_API.limiteParcialesCalendario, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(traducirError(error)))),
    );
  }

  mesasAsignadas(opciones?: OpcionesPedido): Observable<MesaAsignada[]> {
    return this.http
      .get<MesaAsignadaApi[]>(RUTAS_API.misMesasAsignadas, {
        context: contextoDePedido(opciones),
      })
      .pipe(
        map(aMesasAsignadas),
        catchError((error: unknown) => {
          // Un 404 es "este usuario no tiene perfil de docente": no tiene mesas,
          // que no es lo mismo que un fallo (mismo criterio que los legajos).
          if (error instanceof HttpErrorResponse && error.status === 404) {
            return of<MesaAsignada[]>([]);
          }
          console.error('Error al traer las mesas asignadas:', error);
          return throwError(() => new Error(MENSAJE_ERROR_MESAS_ASIGNADAS));
        }),
      );
  }
}

/**
 * El mensaje que ve la persona si el guardado del límite falla.
 *
 * El del backend primero, pero solo si es un rechazo del valor (4xx): ahí
 * explica qué corregir ("El límite de parciales Diarios debe ser mayor a
 * cero."). Un 5xx o una ruta que no existe no le dicen nada útil a quien está
 * en la pantalla.
 */
function traducirError(error: HttpErrorResponse): string {
  const delServidor = mensajeDelServidor(error);
  const esRechazoDelValor =
    error.status >= 400 && error.status < 500 && !esEndpointInexistente(error);

  if (delServidor !== null && esRechazoDelValor) {
    return delServidor;
  }
  console.error('Error al guardar el límite de exámenes por día:', error);
  return MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO;
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

function aMesasAsignadas(respuesta: MesaAsignadaApi[]): MesaAsignada[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta no es una lista de mesas.');
  }
  return respuesta.map(aMesaAsignada);
}

function aMesaAsignada(mesa: MesaAsignadaApi): MesaAsignada {
  // Sin zona y con hora, `new Date` la lee en hora local: la del instituto. Se
  // exige la hora porque un texto de fecha sola se leería en UTC y, en
  // Argentina, caería el día anterior.
  const fecha = TEXTO_FECHA_Y_HORA.test(mesa.fecha) ? new Date(mesa.fecha) : null;
  if (fecha === null || Number.isNaN(fecha.getTime())) {
    throw new Error(`La fecha "${mesa.fecha}" no es válida.`);
  }

  return { idExamen: mesa.idExamen, materia: mesa.materia, fecha };
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
