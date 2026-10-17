import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { MesasExamenService } from './mesas-examen.service';
import { AlertaRechazo } from './modelos/alerta-rechazo';
import { NuevaMesa } from './modelos/nueva-mesa';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** Los docentes que existen en el mock: los mismos ids que `MateriasMockService`. */
const DOCENTES_EXISTENTES = new Set([1, 2]);

type EstadoConfirmacion = 'Pendiente' | 'Aceptada' | 'Rechazada';

/** Un día y una hora contados desde hoy, para que los ejemplos caigan siempre en el futuro. */
function dentroDe(dias: number, hora: number): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora);
}

/**
 * Las mesas de examen, en memoria.
 *
 * No se usa: `app.config.ts` provee `MesasExamenHttpService`. Queda para seguir
 * trabajando en las pantallas con el backend caído, cambiando una línea.
 *
 * Respeta las reglas y los textos de los controladores. El docente de ejemplo
 * tiene pendientes las mesas 1 y 2, las mismas que trae
 * `CalendarioExamenesMockService.mesasAsignadas`, y cada una se puede responder
 * una sola vez. Hay una alerta de rechazo de ejemplo, que se puede archivar.
 */
@Injectable()
export class MesasExamenMockService extends MesasExamenService {
  private readonly respuestas = new Map<number, EstadoConfirmacion>([
    [1, 'Pendiente'],
    [2, 'Pendiente'],
  ]);

  private alertas: AlertaRechazo[] = [
    {
      idExamen: 3,
      idDocente: 2,
      docente: 'Martín Morales',
      materia: 'Pedagogía',
      fecha: dentroDe(10, 10),
    },
  ];

  /** Las asignaciones "idExamen-idDocente" que ya existen, para rechazar las repetidas. */
  private readonly asignaciones = new Set<string>(['3-2']);
  private siguienteIdExamen = 100;

  registrarMesa(mesa: NuevaMesa): Observable<string> {
    if (!DOCENTES_EXISTENTES.has(mesa.idDocente)) {
      return this.fallar('El docente seleccionado no existe.');
    }
    const idExamen = this.siguienteIdExamen++;
    this.asignaciones.add(`${idExamen}-${mesa.idDocente}`);
    return of(
      'Mesa de examen registrada exitosamente. Se ha enviado la notificación pendiente al docente.',
    ).pipe(delay(DEMORA_SIMULADA_MS));
  }

  asignarDocente(idExamen: number, idDocente: number): Observable<string> {
    const clave = `${idExamen}-${idDocente}`;
    if (this.asignaciones.has(clave)) {
      return this.fallar('El docente ya se encuentra asignado a esta mesa de examen.');
    }
    this.asignaciones.add(clave);
    return of('Docente asignado correctamente. Se ha notificado al profesor.').pipe(
      delay(DEMORA_SIMULADA_MS),
    );
  }

  responderAsignacion(idExamen: number, acepta: boolean): Observable<void> {
    const estado = this.respuestas.get(idExamen);
    if (estado === undefined) {
      return this.fallar('No se encontró la asignación a esta mesa de examen.');
    }
    if (estado !== 'Pendiente') {
      return this.fallar(`Esta asignación ya fue respondida anteriormente (${estado}).`);
    }
    this.respuestas.set(idExamen, acepta ? 'Aceptada' : 'Rechazada');
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  alertasDeRechazo(): Observable<AlertaRechazo[]> {
    const ordenadas = [...this.alertas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    return of(ordenadas).pipe(delay(DEMORA_SIMULADA_MS));
  }

  ocultarAlerta(idExamen: number, idDocente: number): Observable<void> {
    const existe = this.alertas.some(
      (alerta) => alerta.idExamen === idExamen && alerta.idDocente === idDocente,
    );
    if (!existe) {
      return this.fallar('Esta alerta ya fue procesada o no se encuentra en estado de rechazo.');
    }
    this.alertas = this.alertas.filter(
      (alerta) => alerta.idExamen !== idExamen || alerta.idDocente !== idDocente,
    );
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  private fallar(mensaje: string): Observable<never> {
    return throwError(() => new Error(mensaje));
  }
}
