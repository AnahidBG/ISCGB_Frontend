import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  TemplateRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CeldaGrilla,
  LUNES_A_DOMINGO,
  MesCalendario,
  descripcionDelDia,
  semanasDelMes,
  tituloDelMes,
} from '../../../../../core/examenes/calendario-mes';
import { DiaCalendario } from '../../../../../core/examenes/modelos/dia-calendario';
import { ExamenCalendario } from '../../../../../core/examenes/modelos/examen-calendario';
import { APARIENCIA_POR_DIA, FONDO_FUERA_DEL_MES } from '../apariencia-por-dia';

/** Una celda lista para dibujar: lo que calcula `semanasDelMes` más lo propio de la grilla. */
export interface CeldaVisible extends CeldaGrilla {
  /** Los parciales de ese día, para listarlos en la celda. */
  examenes: readonly ExamenCalendario[];
  /** Lo que lee un lector de pantalla: "15 de octubre, 1 de 2 parciales". */
  descripcion: string;
  /** `true` si al tocarlo se emite `diaSeleccionado`: la grilla lo permite y el día se puede elegir. */
  puedeElegirse: boolean;
  /**
   * `true` si al tocarlo se emite `diaBloqueado`: la grilla lo permite, el día está
   * completo y todavía no pasó. Es el día que se puede explicar y no se puede elegir.
   */
  estaBloqueado: boolean;
  /** `true` si hay un parcial en el aire y se puede soltar acá. */
  esDestinoDelArrastre: boolean;
}

/** Un parcial soltado en otro día: lo que avisa `examenMovido`. */
export interface MovimientoDeExamen {
  examen: ExamenCalendario;
  /** El día al que se lo soltó. */
  dia: DiaCalendario;
}

/** Lo que recibe la plantilla con la que se personaliza el contenido de cada celda. */
export interface ContextoCeldaGrilla {
  /** La celda que se está dibujando. */
  $implicit: CeldaVisible;
}

/** Cuántos días se mueve el foco con cada flecha: uno a los costados, una semana arriba y abajo. */
const SALTO_POR_TECLA: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/**
 * Lo que tienen todas las celdas. `h-14 sm:h-24` es el alto mínimo (en una tabla
 * un `height` no achica la celda) y el contorno del foco va hacia adentro, para que
 * no lo recorte `overflow-hidden`. `relative` ancla los textos `sr-only` a su celda.
 */
const CLASES_BASE_CELDA =
  'relative h-14 overflow-hidden border border-borde p-1 align-top focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-principal sm:h-24 sm:p-2';

/**
 * La grilla de un mes: siete columnas, de lunes a domingo, con los días de los
 * meses vecinos como relleno.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe los días ya
 * armados y avisa qué se tocó. No conoce el servicio.
 *
 * Contenido de cada celda: por defecto el número del día y "cantidad/límite".
 * Para otro aspecto se le pasa un `ng-template` en `plantillaCelda`; la grilla
 * sigue poniendo la celda (fondo, foco, teclado y atributos de accesibilidad) y
 * la plantilla solo dibuja lo de adentro.
 *
 * Los parciales de `examenes` se listan en su día, cada uno como botón, y al
 * tocarlos se emite `examenSeleccionado`. Sin parciales no se dibuja nada.
 *
 * Teclado: una sola parada de tabulación en toda la grilla (tabindex
 * itinerante). Con las flechas se pasa de un día a otro (izquierda y derecha, un
 * día; arriba y abajo, una semana) y con Enter o Espacio se elige.
 *
 * Elegir un día: la entrada `seleccionable` lo habilita (por defecto no). Con la
 * selección habilitada, los días pasados y los completos no se pueden elegir y
 * se marcan con `aria-disabled`; siguen en el recorrido del teclado para que un
 * lector de pantalla pueda leer por qué. Un día completo que todavía no pasó,
 * al activarlo (clic, Enter o Espacio), emite `diaBloqueado`: quien usa la grilla
 * decide cómo explicarlo.
 *
 * Arrastrar: con `arrastrable`, un parcial que no pasó se agarra y se suelta en
 * otro día que lo admita (de este mes, no pasado ni completo, y distinto del que
 * ya tiene). La grilla solo avisa con `examenMovido`; quien la usa llama al
 * servicio. El arrastre es una comodidad del mouse: el teclado ya tiene su camino,
 * que es tocar el parcial (`examenSeleccionado`) y cambiar la fecha en el modal.
 */
@Component({
  selector: 'app-grilla-calendario',
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: './grilla-calendario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class GrillaCalendario {
  private readonly locale = inject(LOCALE_ID);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  /** El mes que se dibuja. */
  readonly mes = input.required<MesCalendario>();

  /** Los días de ese mes, con su cantidad y su estado. */
  readonly dias = input.required<readonly DiaCalendario[]>();

  /** Los parciales del mes, para listarlos en cada día. Opcional. */
  readonly examenes = input<readonly ExamenCalendario[]>([]);

  /** Cómo dibujar lo de adentro de cada celda. Sin plantilla, el número y "cantidad/límite". */
  readonly plantillaCelda = input<TemplateRef<ContextoCeldaGrilla> | null>(null);

  /** Habilita elegir un día. Deshabilitada por defecto. */
  readonly seleccionable = input<boolean>(false);

  /** Habilita arrastrar un parcial a otro día. Deshabilitada por defecto. */
  readonly arrastrable = input<boolean>(false);

  /** El día de hoy: lo marca la grilla y separa los días pasados. */
  readonly hoy = input<Date>(new Date());

  /** Se emite con el día elegido. Solo con `seleccionable`, y nunca con un día pasado o completo. */
  readonly diaSeleccionado = output<DiaCalendario>();

  /** Se emite con un día completo, que no pasó, que se intentó elegir. Solo con `seleccionable`. */
  readonly diaBloqueado = output<DiaCalendario>();

  /** Se emite con el parcial que se tocó. */
  readonly examenSeleccionado = output<ExamenCalendario>();

  /** Se emite con el parcial que se soltó en otro día. Solo con `arrastrable`. */
  readonly examenMovido = output<MovimientoDeExamen>();

  /** Una semana cualquiera, de lunes a domingo: el locale pone el nombre de cada columna. */
  protected readonly encabezados = LUNES_A_DOMINGO;

  protected readonly titulo = computed(() => tituloDelMes(this.mes(), this.locale));

  /**
   * El parcial que está en el aire, o `null`. Se guarda acá y no en el
   * `DataTransfer` del evento: ese objeto no se puede leer mientras se arrastra
   * (solo al soltar) y jsdom ni siquiera lo trae.
   */
  private readonly examenArrastrado = signal<ExamenCalendario | null>(null);

  /** El día que está bajo el parcial que se arrastra, si se puede soltar ahí. */
  private readonly fechaSobrevolada = signal<string | null>(null);

  protected readonly semanas = computed<CeldaVisible[][]>(() => {
    const examenesPorFecha = new Map<string, ExamenCalendario[]>();
    for (const examen of this.examenes()) {
      examenesPorFecha.set(examen.fecha, [...(examenesPorFecha.get(examen.fecha) ?? []), examen]);
    }
    const permitido = this.seleccionable();
    const enElAire = this.arrastrable() ? this.examenArrastrado() : null;

    return semanasDelMes(this.mes(), this.dias(), this.hoy()).map((semana) =>
      semana.map((celda): CeldaVisible => ({
        ...celda,
        examenes: examenesPorFecha.get(celda.fecha) ?? [],
        descripcion: descripcionDelDia(celda, this.locale),
        puedeElegirse: permitido && celda.elegible && celda.dia !== null,
        estaBloqueado:
          permitido && celda.delMes && !celda.esPasado && celda.dia?.estado === 'completo',
        esDestinoDelArrastre:
          enElAire !== null &&
          celda.elegible &&
          celda.dia !== null &&
          celda.fecha !== enElAire.fecha,
      })),
    );
  });

  /** Las fechas de los días del mes, en orden: por ellas se mueve el foco. */
  private readonly fechasDelMes = computed(() =>
    this.semanas()
      .flat()
      .filter((celda) => celda.delMes)
      .map((celda) => celda.fecha),
  );

  /** La celda a la que se llegó por última vez. Si ya no es de este mes, se descarta. */
  private readonly ultimaFecha = signal<string | null>(null);

  /**
   * La única celda con `tabindex="0"` (tabindex itinerante): la última donde
   * estuvo el foco; si no hay, hoy (cuando es de este mes) y si no, el primer día.
   */
  protected readonly fechaActiva = computed(() => {
    const fechas = this.fechasDelMes();
    const ultima = this.ultimaFecha();
    if (ultima !== null && fechas.includes(ultima)) {
      return ultima;
    }
    const hoy = this.semanas()
      .flat()
      .find((celda) => celda.esHoy && celda.delMes);
    return hoy?.fecha ?? fechas[0] ?? null;
  });

  protected fondoDe(celda: CeldaVisible): string {
    if (!celda.delMes) {
      return FONDO_FUERA_DEL_MES;
    }
    // Bajo el parcial que se arrastra, el día se ilumina en lugar de mostrar su estado.
    if (celda.esDestinoDelArrastre && this.fechaSobrevolada() === celda.fecha) {
      return 'bg-principal-suave';
    }
    return APARIENCIA_POR_DIA[celda.dia?.estado ?? 'disponible'].fondo;
  }

  protected clasesDe(celda: CeldaVisible): string {
    return `${CLASES_BASE_CELDA} ${this.fondoDe(celda)}${this.cursorDe(celda)}${this.contornoDeArrastreDe(celda)}`;
  }

  /** Donde se puede soltar el parcial: un contorno hacia adentro (no lo recorta `overflow-hidden`). */
  private contornoDeArrastreDe(celda: CeldaVisible): string {
    return celda.esDestinoDelArrastre ? ' ring-2 ring-inset ring-principal/50' : '';
  }

  /** El número del día en la celda por defecto: hoy resalta y los de relleno se apagan. */
  protected numeroDe(celda: CeldaVisible): string {
    if (celda.esHoy) {
      return 'font-bold text-principal';
    }
    return celda.delMes ? 'font-medium text-texto' : 'font-medium text-texto-suave';
  }

  private cursorDe(celda: CeldaVisible): string {
    if (celda.puedeElegirse) {
      return ' cursor-pointer hover:bg-principal-suave';
    }
    return this.seleccionable() && celda.delMes ? ' cursor-not-allowed' : '';
  }

  protected alTeclear(evento: KeyboardEvent, celda: CeldaVisible): void {
    // Un `keydown` que sube desde el botón de un parcial no es de la celda.
    if (evento.target !== evento.currentTarget) {
      return;
    }

    const salto = SALTO_POR_TECLA[evento.key];
    if (salto !== undefined) {
      evento.preventDefault();
      const fechas = this.fechasDelMes();
      // En la punta del mes se queda en el primero o el último.
      const posicion = Math.min(
        Math.max(fechas.indexOf(celda.fecha) + salto, 0),
        fechas.length - 1,
      );
      this.enfocarDia(fechas[posicion]);
    } else if (
      (evento.key === 'Enter' || evento.key === ' ') &&
      (celda.puedeElegirse || celda.estaBloqueado)
    ) {
      // Espacio también hace scroll: en un día que se puede activar es "activar".
      evento.preventDefault();
      this.activarDia(celda);
    }
  }

  protected alEnfocar(celda: CeldaVisible): void {
    this.ultimaFecha.set(celda.fecha);
  }

  /** Elige el día, o avisa que está bloqueado si es uno completo. Los demás no hacen nada. */
  protected activarDia(celda: CeldaVisible): void {
    if (celda.dia === null) {
      return;
    }
    if (celda.puedeElegirse) {
      this.diaSeleccionado.emit(celda.dia);
    } else if (celda.estaBloqueado) {
      this.diaBloqueado.emit(celda.dia);
    }
  }

  protected elegirExamen(evento: Event, examen: ExamenCalendario): void {
    // El clic es del botón, no de la celda que lo contiene.
    evento.stopPropagation();
    this.examenSeleccionado.emit(examen);
  }

  protected empezarArrastre(evento: DragEvent, examen: ExamenCalendario): void {
    this.examenArrastrado.set(examen);
    // Firefox no arranca el arrastre sin datos. Se lee el estado de la grilla, no esto.
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
      evento.dataTransfer.setData('text/plain', String(examen.idExamen));
    }
  }

  /** Terminó el arrastre, se haya soltado donde se pudiera o no. */
  protected terminarArrastre(): void {
    this.examenArrastrado.set(null);
    this.fechaSobrevolada.set(null);
  }

  protected alArrastrarSobre(evento: DragEvent, celda: CeldaVisible): void {
    this.fechaSobrevolada.set(celda.esDestinoDelArrastre ? celda.fecha : null);
    if (celda.esDestinoDelArrastre) {
      // Sin `preventDefault` el navegador no deja soltar.
      evento.preventDefault();
      if (evento.dataTransfer) {
        evento.dataTransfer.dropEffect = 'move';
      }
    }
  }

  protected alSoltar(evento: DragEvent, celda: CeldaVisible): void {
    const examen = this.examenArrastrado();
    if (examen === null || celda.dia === null || !celda.esDestinoDelArrastre) {
      return;
    }
    evento.preventDefault();
    this.terminarArrastre();
    this.examenMovido.emit({ examen, dia: celda.dia });
  }

  /**
   * Pasa el foco al día de esa fecha, si es de este mes, y devuelve si pudo. Lo usan
   * las flechas y quien necesita devolver el foco a la grilla después de un cambio.
   */
  enfocarDia(fecha: string): boolean {
    if (!this.fechasDelMes().includes(fecha)) {
      return false;
    }
    this.ultimaFecha.set(fecha);
    this.anfitrion.nativeElement.querySelector<HTMLElement>(`[data-fecha="${fecha}"]`)?.focus();
    return true;
  }
}
