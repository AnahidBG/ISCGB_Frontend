import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ContratoAlumno } from '../../../core/contratos/modelos/contrato-alumno';
import { Icono } from '../icono/icono';

/**
 * Los contratos de un alumno, cada uno con su fecha y el botón para descargarlo.
 *
 * Presentacional: lo usan "Contratos de alumnos" (Secretaría) y el panel del
 * Alumno. No sabe de dónde salen ni cómo se descarga el PDF: solo avisa cuál
 * tocaron.
 */
@Component({
  selector: 'app-lista-contratos',
  imports: [DatePipe, Icono],
  templateUrl: './lista-contratos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaContratos {
  readonly contratos = input<readonly ContratoAlumno[]>([]);

  /** El contrato que se está descargando, para bloquear su botón. */
  readonly descargando = input<number | null>(null);

  readonly textoVacio = input('Todavía no hay contratos cargados.');

  readonly descargar = output<ContratoAlumno>();
}
