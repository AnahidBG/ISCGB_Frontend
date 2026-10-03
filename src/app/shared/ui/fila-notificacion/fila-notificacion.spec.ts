import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { FilaNotificacion } from './fila-notificacion';

/** Cualquier URL existe: los tests tocan enlaces reales y no quieren un NG04002. */
const RUTAS_DE_PRUEBA: Routes = [{ path: '**', children: [] }];

describe('FilaNotificacion', () => {
  let fixture: ComponentFixture<FilaNotificacion>;
  const el = () => fixture.nativeElement as HTMLElement;

  async function dibujar(notificacion: NotificacionPanel, rolEnlace?: 'menuitem') {
    fixture.componentRef.setInput('notificacion', notificacion);
    if (rolEnlace) {
      fixture.componentRef.setInput('rolEnlace', rolEnlace);
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilaNotificacion],
      providers: [provideRouter(RUTAS_DE_PRUEBA)],
    }).compileComponents();
    fixture = TestBed.createComponent(FilaNotificacion);
  });

  it('muestra el título y la descripción', async () => {
    await dibujar({ titulo: 'Rechazaron DNI', detalle: 'Borroso.' });

    expect(el().textContent).toContain('Rechazaron DNI');
    expect(el().textContent).toContain('Borroso.');
  });

  it('sin descripción no dibuja la línea de abajo', async () => {
    await dibujar({ titulo: 'Solo título' });

    expect(el().querySelectorAll('span.text-xs')).toHaveLength(0);
  });

  it('con url es un enlace; sin url no lo es', async () => {
    await dibujar({ titulo: 'Con destino', url: '/legajo/mis-documentos' });
    expect(el().querySelector('a')?.getAttribute('href')).toBe('/legajo/mis-documentos');

    await dibujar({ titulo: 'Sin destino' });
    expect(el().querySelector('a')).toBeNull();
  });

  it('tocar el enlace avisa que la fila fue seleccionada', async () => {
    const seleccionada = vi.fn();
    fixture.componentInstance.seleccionada.subscribe(seleccionada);
    await dibujar({ titulo: 'Con destino', url: '/legajo/mis-documentos' });

    el().querySelector<HTMLAnchorElement>('a')!.click();

    expect(seleccionada).toHaveBeenCalledTimes(1);
  });

  it('muestra una X accesible para descartar la notificación', async () => {
    const eliminada = vi.fn();
    fixture.componentInstance.eliminada.subscribe(eliminada);
    const notificacion = { titulo: 'Rechazaron DNI' };
    await dibujar(notificacion);

    const boton = el().querySelector<HTMLButtonElement>(
      'button[aria-label="Descartar notificación: Rechazaron DNI"]',
    );
    boton!.click();

    expect(eliminada).toHaveBeenCalledWith(notificacion);
  });

  it('el rol del enlace es opcional: solo lo lleva si se lo piden', async () => {
    await dibujar({ titulo: 'x', url: '/a' });
    expect(el().querySelector('a')?.hasAttribute('role')).toBe(false);

    await dibujar({ titulo: 'x', url: '/a' }, 'menuitem');
    expect(el().querySelector('a')?.getAttribute('role')).toBe('menuitem');
  });

  it.each([
    ['rechazado', 'bg-rechazado'],
    ['aprobado', 'bg-aprobado'],
    ['pendiente', 'bg-pendiente'],
    [undefined, 'bg-pendiente'],
  ] as const)('con tono %s el puntito es %s', async (tono, clase) => {
    await dibujar({ titulo: 'x', tono });

    expect(el().querySelector('span[aria-hidden="true"]')?.classList).toContain(clase);
  });
});
