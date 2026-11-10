import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  AuditoriaJustificativo,
  JustificativosService,
} from '../../../core/justificativos/justificativos.service';
import { JustificativoPendiente } from '../../../core/justificativos/modelos/justificativo-pendiente';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { RevisionJustificativos } from './revision-justificativos';

const PENDIENTES: JustificativoPendiente[] = [
  {
    idJustificativo: 4,
    nombreDocente: 'Sara Secretaria',
    tipoInasistencia: 'Enfermedad',
    rutaArchivo: '/uploads/justificativos/a.pdf',
    fechaCarga: new Date('2026-11-09T10:00:00'),
  },
  {
    idJustificativo: 5,
    nombreDocente: 'Dolores Docente',
    tipoInasistencia: 'Causas Personales',
    rutaArchivo: null,
    fechaCarga: new Date('2026-11-10T08:00:00'),
  },
];

describe('RevisionJustificativos', () => {
  let fixture: ComponentFixture<RevisionJustificativos>;
  let auditorias: { id: number; auditoria: AuditoriaJustificativo }[];
  let refrescos: number;

  beforeEach(async () => {
    auditorias = [];
    refrescos = 0;

    await TestBed.configureTestingModule({
      imports: [RevisionJustificativos],
      providers: [
        {
          provide: JustificativosService,
          useValue: {
            listarPendientes: () => of([...PENDIENTES]),
            auditar: (id: number, auditoria: AuditoriaJustificativo) => {
              auditorias.push({ id, auditoria });
              return of(undefined);
            },
          },
        },
        {
          provide: CampanaService,
          useValue: {
            total: signal(0),
            detalle: signal<NotificacionPanel[]>([]),
            refrescar: () => refrescos++,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionJustificativos);
    await fixture.whenStable();
  });

  function texto(): string {
    return fixture.nativeElement.textContent;
  }

  function boton(etiqueta: string, fila = 0): HTMLButtonElement {
    const filas: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    const encontrado = Array.from(filas[fila].querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === etiqueta,
    );
    if (!encontrado) {
      throw new Error(`No hay un botón "${etiqueta}" en la fila ${fila}.`);
    }
    return encontrado;
  }

  /** Marca la casilla de un motivo de `MOTIVOS_RECHAZO` en el cuadro abierto. */
  async function marcarMotivo(motivo: string): Promise<void> {
    const etiquetas: HTMLLabelElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('app-cuadro-rechazo label'),
    );
    const casilla = etiquetas
      .find((etiqueta) => etiqueta.textContent?.trim() === motivo)
      ?.querySelector('input');
    if (!casilla) {
      throw new Error(`No hay una casilla "${motivo}".`);
    }
    casilla.click();
    await fixture.whenStable();
  }

  it('lista los justificativos pendientes', () => {
    expect(texto()).toContain('Sara Secretaria');
    expect(texto()).toContain('Dolores Docente');
  });

  it('aprobar lo audita sin pedir motivo y lo saca de la lista', async () => {
    boton('Aprobar').click();
    await fixture.whenStable();

    expect(auditorias).toEqual([{ id: 4, auditoria: { veredicto: 'Aprobado' } }]);
    expect(fixture.nativeElement.querySelector('ul').textContent).not.toContain('Sara Secretaria');
    expect(texto()).toContain('marcado como Aprobado');
    expect(refrescos).toBe(1);
  });

  it('rechazar abre el cuadro de motivos de la institución sin auditar nada', async () => {
    boton('Rechazar').click();
    await fixture.whenStable();

    expect(auditorias).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-cuadro-rechazo')).not.toBeNull();
    expect(texto()).toContain('Falta sello y/o firma');
  });

  it('no deja confirmar el rechazo sin ningún motivo marcado', async () => {
    boton('Rechazar').click();
    await fixture.whenStable();
    boton('Confirmar rechazo').click();
    await fixture.whenStable();

    expect(auditorias).toEqual([]);
    expect(texto()).toContain('Marcá al menos un motivo');
  });

  it('con un motivo marcado, lo rechaza mandándolo y avisa que sale por correo', async () => {
    boton('Rechazar').click();
    await fixture.whenStable();
    await marcarMotivo('Falta sello y/o firma');
    boton('Confirmar rechazo').click();
    await fixture.whenStable();

    expect(auditorias).toEqual([
      { id: 4, auditoria: { veredicto: 'Rechazado', motivo: 'Falta sello y/o firma' } },
    ]);
    expect(fixture.nativeElement.querySelector('app-cuadro-rechazo')).toBeNull();
    expect(texto()).toContain('El motivo le llega por correo');
  });

  it('cancelar cierra el cuadro sin auditar', async () => {
    boton('Rechazar').click();
    await fixture.whenStable();
    boton('Cancelar').click();
    await fixture.whenStable();

    expect(auditorias).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-cuadro-rechazo')).toBeNull();
  });
});
