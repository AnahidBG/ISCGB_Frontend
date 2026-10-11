import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MateriaDelDocente } from '../../../../../core/examenes/modelos/materia-del-docente';
import { NuevoExamen } from '../../../../../core/examenes/modelos/nuevo-examen';
import { TipoExamen } from '../../../../../core/examenes/modelos/tipo-examen';
import { diaEnPalabras } from '../../../../../core/examenes/registro-examen';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { DialogoModal } from '../../../../../shared/ui/dialogo-modal/dialogo-modal';
import { PantallaCarga } from '../../../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioParcial } from '../formulario-parcial/formulario-parcial';

/**
 * Lo que necesita el formulario antes de dibujarse: las materias del docente y
 * los tipos de examen, con su fase (mismo criterio que `CargaMes`).
 */
export type CargaOpcionesDeRegistro =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | {
      fase: 'listo';
      materias: readonly MateriaDelDocente[];
      tipos: readonly TipoExamen[];
    };

/**
 * El modal "Registrar parcial": el marco (`app-dialogo-modal`), el día elegido en
 * palabras y lo que corresponda a cada fase de la carga de opciones: la espera,
 * el error con "Reintentar", el aviso de que no hay materias asignadas o el
 * formulario.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio. Recibe todo por `input()` y avisa por `output()`.
 */
@Component({
  selector: 'app-registro-parcial',
  imports: [DialogoModal, PantallaCarga, Boton, FormularioParcial],
  templateUrl: './registro-parcial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroParcial {
  private readonly locale = inject(LOCALE_ID);

  /** El día elegido en el calendario: "2026-10-13". */
  readonly dia = input.required<string>();
  readonly hoy = input<Date>(new Date());
  readonly carga = input.required<CargaOpcionesDeRegistro>();

  /** `true` mientras se está guardando: el modal no se puede cerrar. */
  readonly guardando = input<boolean>(false);

  /** Por qué falló el guardado, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  readonly guardar = output<NuevoExamen>();
  readonly cerrar = output<void>();
  readonly reintentar = output<void>();

  protected readonly diaEnTexto = computed(() => diaEnPalabras(this.dia(), this.locale));
}
