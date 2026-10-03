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

  it('el desplegable ofrece "Otros"', async () => {
    const { el } = await crear();
    const opciones = Array.from(el.querySelectorAll('#motivo option')).map((o) =>
      (o as HTMLOptionElement).value,
    );
    expect(opciones).toContain('Otros');
  });

  it('con "Otros" y la nota vacía no envía y avisa que falta la nota', async () => {
    const t = await crear();
    await t.elegirMotivo('Otros');
    await t.elegirFecha();
    await t.adjuntarPdf();
    await t.enviar();

    expect(enviados).toHaveLength(0);
    expect(t.el.textContent).toContain('Con el motivo "Otros" tenés que escribir la nota aclaratoria.');
  });

  it('con "Otros" y una nota de solo espacios tampoco envía', async () => {
    const t = await crear();
    await t.elegirMotivo('Otros');
    await t.elegirFecha();
    await t.adjuntarPdf();
    await t.escribirNota('   \n  ');
    await t.enviar();

    expect(enviados).toHaveLength(0);
  });

  it('con "Otros", fecha, PDF y nota envía una vez con la nota recortada', async () => {
    const t = await crear();
    await t.elegirMotivo('Otros');
    await t.elegirFecha();
    await t.adjuntarPdf();
    await t.escribirNota('  Trámite en el registro civil  ');
    await t.enviar();

    expect(enviados).toHaveLength(1);
    expect(enviados[0].tipoInasistencia).toBe('Otros');
    expect(enviados[0].notaAdicional).toBe('Trámite en el registro civil');
    expect(enviados[0].documentoPdf).toBe(PDF);
  });

  it('con otro motivo la nota sigue siendo opcional y viaja null', async () => {
    const t = await crear();
    await t.elegirMotivo('Causas Personales');
    await t.elegirFecha();
    await t.enviar();

    expect(enviados).toHaveLength(1);
    expect(enviados[0].tipoInasistencia).toBe('Causas Personales');
    expect(enviados[0].notaAdicional).toBeNull();
  });

  it('marca la nota como obligatoria solo con "Otros"', async () => {
    const t = await crear();
    const area = () => t.el.querySelector('#nota')!;
    const etiqueta = () => t.el.querySelector('label[for="nota"]')!.textContent;

    expect(area().getAttribute('aria-required')).not.toBe('true');
    expect(etiqueta()).not.toContain('*');

    await t.elegirMotivo('Otros');
    expect(area().getAttribute('aria-required')).toBe('true');
    expect(etiqueta()).toContain('*');

    await t.elegirMotivo('Enfermedad');
    expect(area().getAttribute('aria-required')).not.toBe('true');
    expect(etiqueta()).not.toContain('*');
  });

  it('al cambiar de motivo no se borra la nota escrita', async () => {
    const t = await crear();
    await t.elegirMotivo('Otros');
    await t.escribirNota('algo');
    await t.elegirMotivo('Enfermedad');

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
