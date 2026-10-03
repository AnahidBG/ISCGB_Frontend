import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { PanelNotificaciones } from './panel-notificaciones';

const avisos = (cuantos: number): NotificacionPanel[] =>
  Array.from({ length: cuantos }, (_, i) => ({
    titulo: `Aviso ${i + 1}`,
    detalle: `Detalle ${i + 1}`,
  }));

/** Cualquier URL existe: los tests tocan enlaces reales y no quieren un NG04002. */
const RUTAS_DE_PRUEBA: Routes = [{ path: '**', children: [] }];

describe('PanelNotificaciones', () => {
  let fixture: ComponentFixture<PanelNotificaciones>;
  const el = () => fixture.nativeElement as HTMLElement;
  const dialogo = () => el().querySelector<HTMLElement>('[role="dialog"]');
  const botonX = () =>
    el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar panel de notificaciones"]');

  async function dibujar(notificaciones: NotificacionPanel[], cantidad = notificaciones.length) {
    fixture.componentRef.setInput('notificaciones', notificaciones);
    fixture.componentRef.setInput('cantidad', cantidad);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelNotificaciones],
      providers: [provideRouter(RUTAS_DE_PRUEBA)],
    }).compileComponents();
    fixture = TestBed.createComponent(PanelNotificaciones);
  });

  it('es un diálogo modal con nombre accesible', async () => {
    await dibujar(avisos(1));

    expect(dialogo()).not.toBeNull();
    expect(dialogo()!.getAttribute('aria-modal')).toBe('true');

    const idTitulo = dialogo()!.getAttribute('aria-labelledby')!;
    expect(el().querySelector(`#${idTitulo}`)?.textContent?.trim()).toBe('Notificaciones');
  });

  it('muestra la cantidad en el encabezado', async () => {
    await dibujar(avisos(2), 9);

    expect(dialogo()!.textContent).toContain('9');
  });

  it('lista TODOS los avisos, sin tope', async () => {
    await dibujar(avisos(8));

    expect(el().querySelectorAll('app-fila-notificacion')).toHaveLength(8);
    expect(el().textContent).toContain('Aviso 8');
  });

  it('el contenido tiene scroll propio', async () => {
    await dibujar(avisos(8));

    expect(el().querySelector('ul')!.classList).toContain('overflow-y-auto');
  });

  it('la X avisa que hay que cerrar', async () => {
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    await dibujar(avisos(1));

    botonX()!.click();

    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('una X descarta una notificación sin cerrar el panel', async () => {
    const eliminada = vi.fn();
    fixture.componentInstance.eliminada.subscribe(eliminada);
    const notificacion = { titulo: 'Rechazaron DNI' };
    await dibujar([notificacion]);

    el()
      .querySelector<HTMLButtonElement>('button[aria-label="Descartar notificación: Rechazaron DNI"]')!
      .click();

    expect(eliminada).toHaveBeenCalledWith(notificacion);
    expect(dialogo()).not.toBeNull();
  });

  it('al abrir, el foco pasa a la X', async () => {
    await dibujar(avisos(1));

    expect(document.activeElement).toBe(botonX());
  });

  it('un aviso con enlace cierra el panel al tocarlo; uno sin enlace no es enlace', async () => {
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    await dibujar([{ titulo: 'Con destino', url: '/legajo/mis-documentos' }, { titulo: 'Sin destino' }]);

    expect(el().querySelectorAll('a')).toHaveLength(1);
    el().querySelector<HTMLAnchorElement>('a')!.click();

    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('un clic en el fondo oscurecido NO lo cierra', async () => {
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    await dibujar(avisos(1));

    el().querySelector<HTMLElement>('[data-fondo]')!.click();

    expect(cerrar).not.toHaveBeenCalled();
  });
});
