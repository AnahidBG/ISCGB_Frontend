import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { contextoDePedido } from '../carga/contexto-pedido';
import { traducirRechazo } from '../comun/error-api';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { RUTAS_API } from '../configuracion/api';
import { textoFechaYHora } from '../examenes/registro-examen';
import {
  MENSAJE_ERROR_ALERTAS_RECHAZO,
  MENSAJE_ERROR_ASIGNAR_DOCENTE,
  MENSAJE_ERROR_OCULTAR_ALERTA,
  MENSAJE_ERROR_REGISTRAR_MESA,
  MENSAJE_ERROR_RESPONDER_MESA,
  MENSAJE_MESA_CREADA,
  MesasExamenService,
} from './mesas-examen.service';
import { AlertaRechazo } from './modelos/alerta-rechazo';
import { NuevaMesa } from './modelos/nueva-mesa';
import { RolMesa, aRolMesa } from './rol-mesa';

/**
 * El cuerpo del `POST .../registrar-mesa` (`RegistrarMesaDto`): la mesa con su
 * tribunal completo. El backend guarda el lugar de cada docente (`rol`:
 * "Presidente", "Vocal 1", "Vocal 2") y les avisa a los tres.
 *
 * Sin `idComision` ni `idTipoExamen`: el DTO todavía los acepta, pero los ignora
 * (la mesa es para todas las comisiones y siempre "Mesa de Examen").
 */
interface RegistrarMesaApi {
  /** Un `DateTime` de .NET, con hora y sin zona: "2026-11-20T09:00:00". */
  fecha: string;
  idMateria: number;
  idPresidente: number;
  idVocal1: number;
  idVocal2: number;
}

/** Un elemento del `GET .../alertas-rechazos`. */
interface AlertaRechazoApi {
  idExamen: number;
  idDocente: number;
  docente: string;
  materia: string;
  /** Un `DateTime` de .NET, con hora y sin zona. */
  fecha: string;
  /** "Presidente", "Vocal 1" o "Vocal 2": el lugar que quedó libre (desde el 10/11/2026). */
  rol?: string;
  /** "El Vocal 1 rechazó la mesa…": no se usa, el texto lo redacta el front. */
  mensaje: string;
}

/** Lo que devuelven las escrituras en un 200. */
interface RespuestaApi {
  message?: string;
}

/** Una fecha CON hora: "2026-11-20T09:00:00". */
const TEXTO_FECHA_Y_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Las mesas de examen contra la API real. */
@Injectable()
export class MesasExamenHttpService extends MesasExamenService {
  private readonly http = inject(HttpClient);

  registrarMesa(mesa: NuevaMesa): Observable<string> {
    // Adapter de salida: nunca `toISOString()`, que pasaría la hora a UTC.
    const cuerpo: RegistrarMesaApi = {
      fecha: textoFechaYHora(mesa.dia, mesa.horario),
      idMateria: mesa.idMateria,
      idPresidente: mesa.idDocente,
      idVocal1: mesa.idVocal1,
      idVocal2: mesa.idVocal2,
    };

    return this.http.post<RespuestaApi>(RUTAS_API.registrarMesaExamen, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || MENSAJE_MESA_CREADA),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(error, MENSAJE_ERROR_REGISTRAR_MESA, 'Error al registrar la mesa:'),
            ),
        ),
      ),
    );
  }

  asignarDocente(idExamen: number, idDocente: number, rol?: RolMesa): Observable<string> {
    // Sin `rol`, el backend cubre el único lugar libre (o pide que se indique cuál).
    const cuerpo = { idExamen, idDocente, ...(rol === undefined ? {} : { rol }) };
    return this.http.post<RespuestaApi>(RUTAS_API.asignarDocenteAMesa, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || 'Docente asignado a la mesa.'),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(
                error,
                MENSAJE_ERROR_ASIGNAR_DOCENTE,
                'Error al asignar el docente a la mesa:',
              ),
            ),
        ),
      ),
    );
  }

  responderAsignacion(idExamen: number, acepta: boolean): Observable<void> {
    // El mensaje del 200 ("Ha aceptada la asignación…") no se muestra: el texto
    // de confirmación lo arma la pantalla, que sabe de qué mesa se trata.
    return this.http.put(RUTAS_API.responderAsignacionMesa, { idExamen, acepta }).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(error, MENSAJE_ERROR_RESPONDER_MESA, 'Error al responder la mesa:'),
            ),
        ),
      ),
    );
  }

  alertasDeRechazo(opciones?: OpcionesPedido): Observable<AlertaRechazo[]> {
    return this.http
      .get<unknown>(RUTAS_API.alertasRechazoMesas, { context: contextoDePedido(opciones) })
      .pipe(
        map(aAlertasDeRechazo),
        catchError((error: unknown) => {
          console.error('Error al traer las mesas rechazadas:', error);
          return throwError(() => new Error(MENSAJE_ERROR_ALERTAS_RECHAZO));
        }),
      );
  }

  ocultarAlerta(idExamen: number, idDocente: number): Observable<void> {
    return this.http.put(RUTAS_API.ocultarAlertaRechazoMesa, { idExamen, idDocente }).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(error, MENSAJE_ERROR_OCULTAR_ALERTA, 'Error al archivar la alerta:'),
            ),
        ),
      ),
    );
  }
}

/** Un id legible: un entero positivo. */
function esId(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

/** El texto sin espacios de los costados, o el de reserva si no hay ninguno. */
function textoO(valor: unknown, reserva: string): string {
  return (typeof valor === 'string' ? valor.trim() : '') || reserva;
}

/**
 * Adapter: la respuesta cruda → las alertas. Tolerante con cada alerta (una que
 * no se puede leer se descarta) y estricto con el conjunto (si no es una lista,
 * falla).
 */
function aAlertasDeRechazo(respuesta: unknown): AlertaRechazo[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta no es una lista de alertas.');
  }
  return respuesta
    .map(aAlertaDeRechazo)
    .filter((alerta): alerta is AlertaRechazo => alerta !== null);
}

function aAlertaDeRechazo(entrada: unknown): AlertaRechazo | null {
  const alerta = (entrada ?? {}) as Partial<Record<keyof AlertaRechazoApi, unknown>>;

  // Sin zona y con hora, `new Date` la lee en hora local: la del instituto. Se
  // exige la hora porque un texto de fecha sola se leería en UTC y, en
  // Argentina, caería el día anterior.
  const fecha =
    typeof alerta.fecha === 'string' && TEXTO_FECHA_Y_HORA.test(alerta.fecha)
      ? new Date(alerta.fecha)
      : null;
  if (
    !esId(alerta.idExamen) ||
    !esId(alerta.idDocente) ||
    fecha === null ||
    Number.isNaN(fecha.getTime())
  ) {
    return null;
  }

  const rol = aRolMesa(alerta.rol);
  return {
    idExamen: alerta.idExamen,
    idDocente: alerta.idDocente,
    docente: textoO(alerta.docente, 'Docente sin nombre cargado'),
    materia: textoO(alerta.materia, 'Materia sin nombre'),
    fecha,
    ...(rol === null ? {} : { rol }),
  };
}
