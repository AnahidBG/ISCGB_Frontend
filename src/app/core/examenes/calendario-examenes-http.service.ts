import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { contextoDePedido } from '../carga/contexto-pedido';
import { esEndpointInexistente, traducirRechazo } from '../comun/error-api';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { RUTAS_API } from '../configuracion/api';
import { aCalendarioDelMes } from './adaptador-estado-mes';
import { aExamenesDelMes } from './adaptador-examenes-mes';
import { mesDe } from './calendario-mes';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_ELIMINAR_EXAMEN,
  MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
  MENSAJE_ERROR_LIMITE_DIARIO,
  MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
  MENSAJE_ERROR_REGISTRAR_EXAMEN,
  MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
  MENSAJE_ERROR_TIPOS_DE_EXAMEN,
} from './calendario-examenes.service';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';
import { MesaAsignada } from './modelos/mesa-asignada';
import { NuevoExamen } from './modelos/nuevo-examen';
import { TipoExamen } from './modelos/tipo-examen';
import { textoFechaYHora } from './registro-examen';

/** El cuerpo del `PUT .../limite-parciales` (`ActualizarLimiteParcialesDto`). */
interface LimiteApi {
  nuevoLimite: number;
}

/** El cuerpo del `POST .../registrar` (`CargaExamenDto`). */
interface CargaExamenApi {
  /** Un `DateTime` de .NET, con hora y sin zona: "2026-10-13T09:00:00". */
  fecha: string;
  idComision: number;
  idMateria: number;
  idTipoExamen: number;
}

/** El cuerpo del `PUT .../modificar/{idExamen}` (`ModificarFechaExamenDto`). */
interface ModificarFechaExamenApi {
  /** Un `DateTime` de .NET, con hora y sin zona: "2026-10-20T09:00:00". */
  nuevaFecha: string;
}

/** Un elemento del `GET .../mis-materias-docente`. */
interface MateriaDelDocenteApi {
  idMateria: number;
  nombreMateria: string;
  carrera: string | null;
  idComision: number;
  nombreComision: string;
}

/** Un elemento del `GET .../tipos-examen`. */
interface TipoExamenApi {
  idTipoExamen: number;
  nombre: string;
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

/** El calendario de parciales contra la API real. */
@Injectable()
export class CalendarioExamenesHttpService extends CalendarioExamenesService {
  private readonly http = inject(HttpClient);

  calendarioDelMes(
    anio: number,
    mes: number,
    opciones?: OpcionesPedido,
  ): Observable<CalendarioDelMes> {
    return this.http
      .get<unknown>(RUTAS_API.estadoMesCalendario(anio, mes), {
        context: contextoDePedido(opciones),
      })
      .pipe(
        // Adapter: la respuesta cruda → el modelo del calendario. Una respuesta
        // que no se puede leer entera es un error.
        map((respuesta) => aCalendarioDelMes(respuesta, { anio, mes })),
        catchError((error: unknown) => {
          console.error('Error al traer el estado del mes del calendario:', error);
          return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
        }),
      );
  }

  /**
   * `del-mes` no recibe año ni mes: devuelve los exámenes del mes en curso según
   * el reloj del servidor. Para cualquier otro mes no hay listado, así que se
   * devuelve una lista vacía sin pegarle al backend (los días se siguen viendo
   * ocupados por `estado-mes`, que sí recibe el mes).
   */
  examenesDelMes(
    anio: number,
    mes: number,
    opciones?: OpcionesPedido,
  ): Observable<ExamenCalendario[]> {
    const enCurso = mesDe(new Date());
    if (anio !== enCurso.anio || mes !== enCurso.mes) {
      return of<ExamenCalendario[]>([]);
    }

    return this.http
      .get<unknown>(RUTAS_API.examenesDelMesEnCurso, { context: contextoDePedido(opciones) })
      .pipe(
        map((respuesta) => aExamenesDelMes(respuesta, { anio, mes })),
        catchError((error: unknown) => {
          console.error('Error al traer los exámenes del mes:', error);
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

    return this.calendarioDelMes(anio, mes).pipe(
      map((calendario) => calendario.limite),
      // `calendarioDelMes` ya dejó el detalle en la consola; acá solo se cambia el
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
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(
                error,
                MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
                'Error al guardar el límite de exámenes por día:',
              ),
            ),
        ),
      ),
    );
  }

  materiasDelDocente(opciones?: OpcionesPedido): Observable<MateriaDelDocente[]> {
    return this.http
      .get<unknown>(RUTAS_API.misMateriasDocente, { context: contextoDePedido(opciones) })
      .pipe(
        map(aMateriasDelDocente),
        catchError((error: unknown) => {
          // Un 404 con texto es "este usuario no tiene perfil de docente": no tiene
          // materias, que no es lo mismo que un fallo. Sin cuerpo es una ruta que no
          // existe, y eso sí es un fallo.
          if (
            error instanceof HttpErrorResponse &&
            error.status === 404 &&
            !esEndpointInexistente(error)
          ) {
            return of<MateriaDelDocente[]>([]);
          }
          console.error('Error al traer las materias del docente:', error);
          return throwError(() => new Error(MENSAJE_ERROR_MATERIAS_DEL_DOCENTE));
        }),
      );
  }

  tiposDeExamen(opciones?: OpcionesPedido): Observable<TipoExamen[]> {
    return this.http
      .get<unknown>(RUTAS_API.tiposDeExamen, { context: contextoDePedido(opciones) })
      .pipe(
        map(aTiposDeExamen),
        catchError((error: unknown) => {
          console.error('Error al traer los tipos de examen:', error);
          return throwError(() => new Error(MENSAJE_ERROR_TIPOS_DE_EXAMEN));
        }),
      );
  }

  registrarExamen(examen: NuevoExamen, opciones?: OpcionesPedido): Observable<void> {
    // Adapter de salida: el día y el horario se arman en un texto sin zona. Nunca
    // con `toISOString()`, que lo pasaría a UTC y correría el examen tres horas.
    const cuerpo: CargaExamenApi = {
      fecha: textoFechaYHora(examen.dia, examen.horario),
      idComision: examen.idComision,
      idMateria: examen.idMateria,
      idTipoExamen: examen.idTipoExamen,
    };

    return this.http
      .post(RUTAS_API.registrarExamen, cuerpo, { context: contextoDePedido(opciones) })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(
            () =>
              new Error(
                traducirRechazo(
                  error,
                  MENSAJE_ERROR_REGISTRAR_EXAMEN,
                  'Error al registrar el parcial:',
                ),
              ),
          ),
        ),
      );
  }

  reprogramarExamen(
    idExamen: number,
    fechaYHora: string,
    opciones?: OpcionesPedido,
  ): Observable<void> {
    // La fecha ya viene como texto local sin zona (`textoFechaYHora`): se manda tal cual.
    const cuerpo: ModificarFechaExamenApi = { nuevaFecha: fechaYHora };

    return this.http
      .put(RUTAS_API.modificarExamen(idExamen), cuerpo, { context: contextoDePedido(opciones) })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(
            () =>
              new Error(
                traducirRechazo(
                  error,
                  MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
                  'Error al reprogramar el parcial:',
                ),
              ),
          ),
        ),
      );
  }

  eliminarExamen(idExamen: number, opciones?: OpcionesPedido): Observable<void> {
    return this.http
      .delete(RUTAS_API.eliminarExamen(idExamen), { context: contextoDePedido(opciones) })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) =>
          throwError(
            () =>
              new Error(
                traducirRechazo(
                  error,
                  MENSAJE_ERROR_ELIMINAR_EXAMEN,
                  'Error al eliminar el parcial:',
                ),
              ),
          ),
        ),
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

/** Un id legible: un entero positivo. */
function esId(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

/** Un texto, sin espacios sobrantes. Lo que no es texto queda vacío. */
function textoLimpio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function aMateriasDelDocente(respuesta: unknown): MateriaDelDocente[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta no es una lista de materias.');
  }
  return respuesta.map(aMateriaDelDocente);
}

function aMateriaDelDocente(entrada: unknown): MateriaDelDocente {
  const materia = (entrada ?? {}) as Partial<Record<keyof MateriaDelDocenteApi, unknown>>;
  if (!esId(materia.idMateria) || !esId(materia.idComision)) {
    throw new Error('Una materia de la respuesta no trae su id o el de su comisión.');
  }

  return {
    idMateria: materia.idMateria,
    materia: textoLimpio(materia.nombreMateria) || 'Materia sin nombre',
    // Anulable en la base: un texto vacío o de espacios es "no cargada".
    carrera: textoLimpio(materia.carrera) || null,
    idComision: materia.idComision,
    comision: textoLimpio(materia.nombreComision) || 'Comisión sin nombre',
  };
}

function aTiposDeExamen(respuesta: unknown): TipoExamen[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta no es una lista de tipos de examen.');
  }
  return respuesta.map((entrada: unknown): TipoExamen => {
    const tipo = (entrada ?? {}) as Partial<Record<keyof TipoExamenApi, unknown>>;
    const nombre = textoLimpio(tipo.nombre);
    if (!esId(tipo.idTipoExamen) || nombre === '') {
      throw new Error('Un tipo de examen de la respuesta no se puede leer.');
    }
    return { idTipoExamen: tipo.idTipoExamen, nombre };
  });
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
