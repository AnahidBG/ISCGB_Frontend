import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DocenteDisponible } from '../../../../../core/materias/modelos/asignacion-materia';
import { AlertaRechazo } from '../../../../../core/mesas/modelos/alerta-rechazo';
import { fechaDeMesa } from '../../../../../core/mesas/textos-mesas';
import { Boton } from '../../../../../shared/ui/boton/boton';

/** Convocar a otro docente a la mesa de una alerta. */
export interface Reasignacion {
  alerta: AlertaRechazo;
  idDocente: number;
}

/** Una alerta se identifica por la mesa y el docente que la rechazó. */
export function claveDeAlerta(alerta: AlertaRechazo): string {
  return `${alerta.idExamen}-${alerta.idDocente}`;
}

/**
 * Las mesas que algún docente rechazó (SCRUM-247), cada una con "Ya lo vi" para
 * archivarla y, si la sesión puede, un desplegable para convocar a otro docente.
 *
 * PRESENTACIONAL: recibe las alertas y avisa qué se tocó. El contenedor
 * (`MesasExamen`) habla con el servicio y saca de la lista lo que se resuelve.
 */
@Component({
  selector: 'app-alertas-rechazo',
  imports: [Boton],
  templateUrl: './alertas-rechazo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasRechazo {
  private readonly locale = inject(LOCALE_ID);

  readonly alertas = input<readonly AlertaRechazo[]>([]);
  readonly docentes = input<readonly DocenteDisponible[]>([]);

  /**
   * Si la sesión puede convocar a otro docente. El backend solo se lo deja a
   * Dirección (`asignar-docente` pide "Director,Administrador").
   */
  readonly puedeReasignar = input(false);

  /** La alerta que se está resolviendo (`claveDeAlerta`): sus botones quedan bloqueados. */
  readonly procesando = input<string | null>(null);

  readonly archivar = output<AlertaRechazo>();
  readonly reasignar = output<Reasignacion>();

  protected readonly claveDe = claveDeAlerta;

  /** El docente elegido en el desplegable de cada alerta, por clave. */
  protected readonly elegidos = signal<Readonly<Record<string, string>>>({});

  protected fecha(alerta: AlertaRechazo): string {
    return fechaDeMesa(alerta.fecha, this.locale);
  }

  /** Los docentes a los que se puede convocar: todos menos el que la rechazó. */
  protected otrosDocentes(alerta: AlertaRechazo): readonly DocenteDisponible[] {
    return this.docentes().filter(({ idDocente }) => idDocente !== alerta.idDocente);
  }

  protected elegir(alerta: AlertaRechazo, idDocente: string): void {
    this.elegidos.update((elegidos) => ({ ...elegidos, [claveDeAlerta(alerta)]: idDocente }));
  }

  protected elegido(alerta: AlertaRechazo): string {
    return this.elegidos()[claveDeAlerta(alerta)] ?? '';
  }

  protected alReasignar(alerta: AlertaRechazo): void {
    const idDocente = this.elegido(alerta);
    if (idDocente === '' || this.procesando() !== null) {
      return;
    }
    this.reasignar.emit({ alerta, idDocente: Number(idDocente) });
  }

  protected alArchivar(alerta: AlertaRechazo): void {
    if (this.procesando() === null) {
      this.archivar.emit(alerta);
    }
  }
}
