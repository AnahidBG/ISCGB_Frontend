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
 *   · `POST /api/ConfiguracionCalendario/asignar-docente` → `asignarDocente` (Director, Administrador)
 *   · `PUT /api/Docente/responder-asignacion` → `responderAsignacion` (Docente)
 *   · `GET /api/Configuracion/alertas-rechazos` → `alertasDeRechazo` (Director, Secretario)
 *   · `PUT /api/Configuracion/ocultar-alerta-rechazo` → `ocultarAlerta` (Director, Secretario)
 *
 * Las mesas que le asignaron al docente (`GET /api/Configuracion/mis-notificaciones`)
 * siguen en `CalendarioExamenesService.mesasAsignadas`, que es de donde las lee la campana.
 */
export abstract class MesasExamenService {
  /**
   * Crea la mesa y deja al docente convocado, con la asignación "Pendiente".
   * Devuelve el mensaje de confirmación del backend.
   *
   * Falla con el mensaje del backend cuando rechaza el pedido (el docente no
   * existe, por ejemplo), o con `MENSAJE_ERROR_REGISTRAR_MESA`.
   */
  abstract registrarMesa(mesa: NuevaMesa): Observable<string>;

  /**
   * Convoca a otro docente a una mesa que ya existe, por ejemplo después de un
   * rechazo. Devuelve el mensaje de confirmación del backend.
   *
   * El backend solo se lo permite al rol Director (pide "Director,Administrador" y
   * el rol Administrador no existe): Secretaría recibe 403.
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
