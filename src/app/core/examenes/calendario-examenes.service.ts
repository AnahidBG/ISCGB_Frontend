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

/**
 * El calendario de parciales (SCRUM-183, consulta del estado de cada día), el
 * registro de un parcial por parte del docente, el límite de parciales, que fija
 * Secretaría, y las mesas de examen que le asignaron al docente.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend:
 *
 *   · `GET /api/ConfiguracionCalendario/estado-mes?anio=&mes=` → `calendarioDelMes` y `limiteDiario`
 *   · `PUT /api/ConfiguracionCalendario/limite-parciales` → `guardarLimiteDiario`
 *   · `GET /api/ConfiguracionCalendario/mis-materias-docente` → `materiasDelDocente`
 *   · `GET /api/ConfiguracionCalendario/tipos-examen` → `tiposDeExamen`
 *   · `POST /api/ConfiguracionCalendario/registrar` → `registrarExamen`
 *   · `GET /api/Configuracion/mis-notificaciones` → `mesasAsignadas`
 *
 * Modificar y eliminar parciales existen en el backend y todavía no se
 * consumen. Tampoco hay un endpoint que liste los parciales: por eso
 * `examenesDelMes` devuelve una lista vacía contra la API real. Y no hay forma
 * de aceptar ni rechazar una mesa ni de darla de alta.
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
   * listarlos en el día que les toca. `mes` va de 1 a 12.
   *
   * El backend todavía no tiene un endpoint que los liste: la implementación
   * HTTP devuelve una lista vacía y solo la simulada trae ejemplos.
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
