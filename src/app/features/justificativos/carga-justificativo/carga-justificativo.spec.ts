import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { JustificativosService } from '../../../core/justificativos/justificativos.service';
import { NuevoJustificativo } from '../../../core/justificativos/modelos/justificativo-pendiente';
import { CargaJustificativo } from './carga-justificativo';

const PDF = new File(['%PDF-1.4'], 'certificado.pdf', { type: 'application/pdf' });

describe('CargaJustificativo', () => {
  const AVISOS: NotificacionPanel[] = [{ titulo: 'Rechazaron DNI', tono: 'rechazado' }];
  const campana = {
    total: signal(3),
    detalle: signal<NotificacionPanel[]>(AVISOS),
    refrescar: vi.fn(),
  };

  let enviados: NuevoJustificativo[];

  beforeEach(() => {
    campana.refrescar.mockClear();
    enviados = [];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CampanaService, useValue: campana },
        {
          provide: AuthService,
          useValue: { sesion: signal({ idUsuario: 7, roles: [] }), cerrarSesion: () => {} },
        },
        {
          provide: JustificativosService,
          useValue: {
            cargar: (j: NuevoJustificativo): Observable<string> => {
              enviados.push(j);
              return of('ok');
            },
          },
        },
      ],
    });
  });

  async function crear() {
    const fixture = TestBed.createComponent(CargaJustificativo);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    async function elegirMotivo(valor: string) {
      const select = el.querySelector<HTMLSelectElement>('#motivo')!;
      select.value = valor;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    async function escribirNota(texto: string) {
      const area = el.querySelector<HTMLTextAreaElement>('#nota')!;
      area.value = texto;
      area.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    }

    async function elegirFecha() {
      const input = el.querySelector<HTMLInputElement>('#desde')!;
      input.value = '2026-09-10';
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    async function adjuntarPdf() {
      (fixture.componentInstance as unknown as { archivo: { set(f: File): void } }).archivo.set(PDF);
      await fixture.whenStable();
    }

    async function enviar() {
      el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    }

    return { fixture, el, elegirMotivo, escribirNota, elegirFecha, adjuntarPdf, enviar };
  }

  it('con fecha, PDF y nota envía una vez con el valor del motivo y la nota recortada', async () => {
    const t = await crear();
    await t.elegirMotivo('Causas Médicas');
    await t.elegirFecha();
    await t.adjuntarPdf();
    await t.escribirNota('  Turno con el especialista  ');
    await t.enviar();

    expect(enviados).toHaveLength(1);
    expect(enviados[0].tipoInasistencia).toBe('Causas Médicas');
    expect(enviados[0].notaAdicional).toBe('Turno con el especialista');
    expect(enviados[0].documentoPdf).toBe(PDF);
  });

  it('la nota es opcional: sin escribirla viaja null', async () => {
    const t = await crear();
    await t.elegirMotivo('Causas Personales');
    await t.elegirFecha();
    await t.enviar();

    expect(enviados).toHaveLength(1);
    expect(enviados[0].tipoInasistencia).toBe('Causas Personales');
    expect(enviados[0].notaAdicional).toBeNull();
  });

  it('al cambiar de motivo no se borra la nota escrita', async () => {
    const t = await crear();
    await t.elegirMotivo('Causas Médicas');
    await t.escribirNota('algo');
    await t.elegirMotivo('Causas Académicas');

    expect(t.el.querySelector<HTMLTextAreaElement>('#nota')!.value).toBe('algo');
  });

  it('pide el refresco de la campana y le pasa al encabezado el total y el detalle del servicio', async () => {
    const fixture = TestBed.createComponent(CargaJustificativo);
    await fixture.whenStable();
    const encabezado = fixture.debugElement.query(
      (d) => d.componentInstance instanceof EstructuraPanel,
    ).componentInstance as EstructuraPanel;

    expect(campana.refrescar).toHaveBeenCalledTimes(1);
    expect(encabezado.notificaciones()).toBe(3);
    expect(encabezado.notificacionesDetalle()).toEqual(AVISOS);
  });
});
