import { Observable } from 'rxjs';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';
import { MesaAsignada } from './modelos/mesa-asignada';
import { NuevoExamen } from './modelos/nuevo-examen';
import { TipoExamen } from './modelos/tipo-examen';
import { PERIODO_DEL_LIMITE } from './periodo-limite';

export const MENSAJE_ERROR_CALENDARIO =
  'No pudimos traer el calendario de parciales. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_LIMITE_DIARIO = `No pudimos traer el límite de parciales por ${PERIODO_DEL_LIMITE}. Intentá de nuevo en un momento.`;

export const MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO =
  'No pudimos guardar el límite. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_MESAS_ASIGNADAS =
  'No pudimos traer tus mesas de examen. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_MATERIAS_DEL_DOCENTE =
  'No pudimos traer tus materias. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_TIPOS_DE_EXAMEN =
  'No pudimos traer los tipos de examen. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_REGISTRAR_EXAMEN =
  'No pudimos registrar el parcial. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_REPROGRAMAR_EXAMEN =
  'No pudimos reprogramar el parcial. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_ELIMINAR_EXAMEN =
  'No pudimos eliminar el parcial. Intentá de nuevo en un momento.';

/**
 * El calendario de parciales (SCRUM-183, consulta del estado de cada día), el
 * registro, la reprogramación y la baja de un parcial por parte del docente, el
 * límite de parciales, que fija Secretaría, y las mesas de examen que le
 * asignaron al docente.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend:
 *
 *   · `GET /api/ConfiguracionCalendario/estado-mes?anio=&mes=` → `calendarioDelMes` y `limiteDiario`
 *   · `GET /api/ConfiguracionCalendario/del-mes` → `examenesDelMes` (solo el mes en curso)
 *   · `PUT /api/ConfiguracionCalendario/limite-parciales` → `guardarLimiteDiario`
 *   · `GET /api/ConfiguracionCalendario/mis-materias-docente` → `materiasDelDocente`
 *   · `GET /api/ConfiguracionCalendario/tipos-examen` → `tiposDeExamen`
 *   · `POST /api/ConfiguracionCalendario/registrar` → `registrarExamen`
 *   · `PUT /api/ConfiguracionCalendario/modificar/{idExamen}` → `reprogramarExamen`
 *   · `DELETE /api/ConfiguracionCalendario/eliminar/{idExamen}` → `eliminarExamen`
 *   · `GET /api/Configuracion/mis-notificaciones` → `mesasAsignadas`
 *
 * `del-mes` solo lista el mes en curso (el backend usa su propio reloj y no
 * recibe año ni mes): en los demás meses `examenesDelMes` devuelve una lista
 * vacía contra la API real, y ahí la pantalla no tiene parciales que reprogramar
 * o eliminar. Las mesas de examen (alta, asignación, respuesta y alertas) son
 * otro dominio: `MesasExamenService`.
 */
export abstract class CalendarioExamenesService {
  /**
   * Cómo está un mes: el límite y TODOS sus días, con la cantidad de parciales y
   * el estado de cada uno (los que el backend no lista vienen con cantidad 0).
   * `mes` va de 1 a 12.
   *
   * `opciones.enSegundoPlano`: la pantalla ya muestra su propia espera, que no
   * tape todo con el velo global.
   *
   * Falla con `MENSAJE_ERROR_CALENDARIO`.
   */
  abstract calendarioDelMes(
    anio: number,
    mes: number,
    opciones?: OpcionesPedido,
  ): Observable<CalendarioDelMes>;

  /**
   * Los parciales registrados en un mes, con su materia, comisión y tipo, para
   * listarlos en el día que les toca, ordenados por día y hora. `mes` va de 1 a 12.
   *
   * El backend solo los lista para el mes en curso: con la implementación HTTP,
   * cualquier otro mes da una lista vacía sin pedir nada.
   *
   * Falla con `MENSAJE_ERROR_CALENDARIO`.
   */
  abstract examenesDelMes(
    anio: number,
    mes: number,
    opciones?: OpcionesPedido,
  ): Observable<ExamenCalendario[]>;

  /**
   * Cuántos parciales admite el período (hoy, un día). Es uno solo, para todo el
   * instituto y para todos los tipos de examen. Si nunca se configuró, el
   * backend devuelve su valor por defecto (2).
   *
   * Falla con `MENSAJE_ERROR_LIMITE_DIARIO`.
   */
  abstract limiteDiario(): Observable<number>;

  /**
   * Fija el límite de parciales. Tiene que ser un entero mayor a 0.
   *
   * Falla con el mensaje del backend cuando rechaza el valor, o con
   * `MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO`.
   */
  abstract guardarLimiteDiario(limite: number): Observable<void>;

  /**
   * Las materias que dicta el docente de la sesión, cada una con su comisión: lo
   * que elige al registrar un parcial. Solo sirve con el rol Docente.
   *
   * Un docente sin materias asignadas, o sin perfil de docente, recibe una lista
   * vacía: no es un error.
   *
   * `opciones.enSegundoPlano`: el formulario ya muestra su propia espera.
   *
   * Falla con `MENSAJE_ERROR_MATERIAS_DEL_DOCENTE`.
   */
  abstract materiasDelDocente(opciones?: OpcionesPedido): Observable<MateriaDelDocente[]>;

  /**
   * Los tipos de examen que se pueden registrar ("Parcial", "Coloquio"...), con el
   * nombre que trae el backend.
   *
   * Falla con `MENSAJE_ERROR_TIPOS_DE_EXAMEN`.
   */
  abstract tiposDeExamen(opciones?: OpcionesPedido): Observable<TipoExamen[]>;

  /**
   * Registra un examen en el calendario.
   *
   * El backend rechaza el día que ya alcanzó el límite, y no valida que la fecha
   * no sea pasada ni que los ids existan: eso lo cuida quien llama.
   *
   * Falla con el mensaje del backend cuando rechaza el pedido (el límite
   * alcanzado, por ejemplo), o con `MENSAJE_ERROR_REGISTRAR_EXAMEN`.
   */
  abstract registrarExamen(examen: NuevoExamen, opciones?: OpcionesPedido): Observable<void>;

  /**
   * Mueve un examen a otra fecha u hora. Es lo único que el backend deja cambiar:
   * la materia, la comisión y el tipo se quedan como están.
   *
   * `fechaYHora` es el texto local sin zona que arma `textoFechaYHora`
   * ("2026-10-20T09:00:00"), nunca un `toISOString()`.
   *
   * El backend rechaza el día que ya alcanzó el límite (sin contar al propio
   * examen) y un examen que no existe, y no valida que la fecha no sea pasada.
   *
   * Falla con el mensaje del backend cuando rechaza el pedido, o con
   * `MENSAJE_ERROR_REPROGRAMAR_EXAMEN`.
   */
  abstract reprogramarExamen(
    idExamen: number,
    fechaYHora: string,
    opciones?: OpcionesPedido,
  ): Observable<void>;

  /**
   * Quita un examen del calendario.
   *
   * Falla con el mensaje del backend cuando el examen no existe, o con
   * `MENSAJE_ERROR_ELIMINAR_EXAMEN`.
   */
  abstract eliminarExamen(idExamen: number, opciones?: OpcionesPedido): Observable<void>;

  /**
   * Las mesas de examen a las que asignaron al docente de la sesión y que
   * todavía no respondió. Solo sirve con el rol Docente.
   *
   * Trae TODAS, también las de exámenes que ya pasaron: filtrarlas es cosa de
   * quien las muestra. Un usuario sin perfil de docente no tiene mesas y recibe
   * una lista vacía.
   *
   * `opciones.enSegundoPlano`: lo pide la campana en todas las pantallas, que no
   * tape nada con el velo global.
   *
   * Falla con `MENSAJE_ERROR_MESAS_ASIGNADAS`.
   */
  abstract mesasAsignadas(opciones?: OpcionesPedido): Observable<MesaAsignada[]>;
}
