import { Observable } from 'rxjs';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { AlertaRechazo } from './modelos/alerta-rechazo';
import { NuevaMesa } from './modelos/nueva-mesa';

export const MENSAJE_ERROR_REGISTRAR_MESA =
  'No pudimos crear la mesa de examen. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_ASIGNAR_DOCENTE =
  'No pudimos asignar el docente a la mesa. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_RESPONDER_MESA =
  'No pudimos guardar tu respuesta. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_ALERTAS_RECHAZO =
  'No pudimos traer las mesas rechazadas. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_OCULTAR_ALERTA =
  'No pudimos archivar el aviso. Intentá de nuevo en un momento.';

export const MENSAJE_MESA_CREADA =
  'Mesa creada. Convocamos a quien la preside y a los dos vocales: cada uno recibe el aviso para aceptarla o rechazarla.';

/**
 * La mesa se creó, pero no se pudo convocar a todo el tribunal. No es un error
 * como los otros: la mesa ya existe, así que la pantalla vacía el formulario
 * para que no se cree dos veces, y muestra el mensaje.
 */
export class MesaIncompleta extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'MesaIncompleta';
  }
}

/**
 * Las mesas de examen (SCRUM-245, SCRUM-246 y SCRUM-247): Dirección o Secretaría
 * arman una mesa y convocan a un docente, el docente acepta o rechaza, y si
 * rechaza Dirección y Secretaría reciben la alerta para reasignarla.
 *
 * Mismo patrón que el resto de `core/`: una clase abstracta con una
 * implementación HTTP y una simulada, intercambiables desde `app.config.ts`.
 *
 * Endpoints del backend (commit `d771acb`, 17/10/2026):
 *
 *   · `POST /api/ConfiguracionCalendario/registrar-mesa` → `registrarMesa` (Director, Secretario)
 *   · `POST /api/ConfiguracionCalendario/asignar-docente` → `asignarDocente` (Director, Secretario)
 *   · `PUT /api/Docente/responder-asignacion` → `responderAsignacion` (Docente)
 *   · `GET /api/Configuracion/alertas-rechazos` → `alertasDeRechazo` (Director, Secretario)
 *   · `PUT /api/Configuracion/ocultar-alerta-rechazo` → `ocultarAlerta` (Director, Secretario)
 *
 * Las mesas que le asignaron al docente (`GET /api/Configuracion/mis-notificaciones`)
 * siguen en `CalendarioExamenesService.mesasAsignadas`, que es de donde las lee la campana.
 */
export abstract class MesasExamenService {
  /**
   * Crea la mesa con quien la preside y después convoca a los dos vocales: los
   * tres quedan con la asignación "Pendiente". Devuelve `MENSAJE_MESA_CREADA`.
   *
   * Falla con el mensaje del backend cuando rechaza la mesa (el docente no
   * existe, por ejemplo), o con `MENSAJE_ERROR_REGISTRAR_MESA`. Si la mesa se
   * crea pero no se puede convocar a un vocal, falla con `MesaIncompleta`.
   */
  abstract registrarMesa(mesa: NuevaMesa): Observable<string>;

  /**
   * Convoca a otro docente a una mesa que ya existe, por ejemplo después de un
   * rechazo. Devuelve el mensaje de confirmación del backend.
   *
   * Lo pueden usar Dirección y Secretaría: hasta el 10/11/2026 el backend pedía
   * "Director,Administrador" y Secretaría recibía 403.
   *
   * Falla con el mensaje del backend (ese docente ya está asignado), o con
   * `MENSAJE_ERROR_ASIGNAR_DOCENTE`.
   */
  abstract asignarDocente(idExamen: number, idDocente: number): Observable<string>;

  /**
   * El docente de la sesión acepta (`true`) o rechaza (`false`) la mesa a la que
   * lo asignaron. Solo sirve con el rol Docente.
   *
   * Falla con el mensaje del backend cuando ya la respondió o no la encuentra, o
   * con `MENSAJE_ERROR_RESPONDER_MESA`.
   */
  abstract responderAsignacion(idExamen: number, acepta: boolean): Observable<void>;

  /**
   * Las mesas que algún docente rechazó y que nadie archivó todavía, de la más
   * próxima a la más lejana.
   *
   * `opciones.enSegundoPlano`: lo pide la campana en todas las pantallas, que no
   * tape nada con el velo global.
   *
   * Falla con `MENSAJE_ERROR_ALERTAS_RECHAZO`.
   */
  abstract alertasDeRechazo(opciones?: OpcionesPedido): Observable<AlertaRechazo[]>;

  /**
   * Archiva la alerta ("Ya lo vi"). No borra el rechazo: el backend lo guarda
   * como "Rechazada_Vista" para el historial.
   *
   * Falla con el mensaje del backend cuando la alerta ya se archivó o no existe,
   * o con `MENSAJE_ERROR_OCULTAR_ALERTA`.
   */
  abstract ocultarAlerta(idExamen: number, idDocente: number): Observable<void>;
}
