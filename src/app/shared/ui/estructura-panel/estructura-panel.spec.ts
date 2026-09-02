import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstructuraPanel } from './estructura-panel';

const CLAVE_COLAPSADO = 'iscgb.panel.colapsado';

describe('EstructuraPanel', () => {
  let component: EstructuraPanel;
  let fixture: ComponentFixture<EstructuraPanel>;

  beforeEach(async () => {
    localStorage.removeItem(CLAVE_COLAPSADO);

    await TestBed.configureTestingModule({
      imports: [EstructuraPanel],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EstructuraPanel);
    fixture.componentRef.setInput('enlaces', [{ etiqueta: 'Dashboard', url: '/inicio' }]);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem(CLAVE_COLAPSADO);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca expandido cuando no hay preferencia guardada', () => {
    expect((component as any).colapsado()).toBe(false);
  });

  it('alternarColapso invierte el estado y lo persiste en localStorage', () => {
    (component as any).alternarColapso();
    expect((component as any).colapsado()).toBe(true);
    expect(localStorage.getItem(CLAVE_COLAPSADO)).toBe('1');

    (component as any).alternarColapso();
    expect((component as any).colapsado()).toBe(false);
    expect(localStorage.getItem(CLAVE_COLAPSADO)).toBe('0');
  });

  it('arranca colapsado si la preferencia guardada dice "1"', async () => {
    localStorage.setItem(CLAVE_COLAPSADO, '1');

    const otraFixture = TestBed.createComponent(EstructuraPanel);
    otraFixture.componentRef.setInput('enlaces', []);
    await otraFixture.whenStable();

    expect((otraFixture.componentInstance as any).colapsado()).toBe(true);
  });

  it('las iniciales salen de la primera y la última palabra del nombre', () => {
    fixture.componentRef.setInput('nombreUsuario', 'Milena Previgliano');
    fixture.detectChanges();
    expect((component as any).iniciales()).toBe('MP');
  });

  describe('campana de notificaciones', () => {
    it('sin novedades no enciende el puntito rojo', () => {
      expect((component as any).hayNotificaciones()).toBe(false);
      expect((component as any).cantidadNotificaciones()).toBe(0);
    });

    it('la cantidad sale de la lista cuando el panel no manda número', () => {
      fixture.componentRef.setInput('notificacionesDetalle', [
        { titulo: 'Rechazaron Título' },
        { titulo: 'Rechazaron DNI' },
      ]);
      fixture.detectChanges();

      expect((component as any).cantidadNotificaciones()).toBe(2);
      expect((component as any).hayNotificaciones()).toBe(true);
      expect((component as any).notificacionesNoListadas()).toBe(0);
    });

    it('avisa cuántas novedades quedaron afuera de la lista', () => {
      fixture.componentRef.setInput('notificaciones', 9);
      fixture.componentRef.setInput('notificacionesDetalle', [{ titulo: 'Una sola fila' }]);
      fixture.detectChanges();

      expect((component as any).cantidadNotificaciones()).toBe(9);
      expect((component as any).notificacionesNoListadas()).toBe(8);
    });

    it('nunca informa un sobrante negativo si la lista trae más que el número', () => {
      fixture.componentRef.setInput('notificaciones', 1);
      fixture.componentRef.setInput('notificacionesDetalle', [
        { titulo: 'Una' },
        { titulo: 'Dos' },
        { titulo: 'Tres' },
      ]);
      fixture.detectChanges();

      expect((component as any).notificacionesNoListadas()).toBe(0);
    });

    it('abrir la campana cierra el menú de la persona, y al revés', () => {
      const evento = new MouseEvent('click');

      (component as any).alternarMenuPerfil(evento);
      expect((component as any).menuPerfilAbierto()).toBe(true);

      (component as any).alternarMenuNotificaciones(evento);
      expect((component as any).menuNotificacionesAbierto()).toBe(true);
      expect((component as any).menuPerfilAbierto()).toBe(false);

      (component as any).alternarMenuPerfil(evento);
      expect((component as any).menuPerfilAbierto()).toBe(true);
      expect((component as any).menuNotificacionesAbierto()).toBe(false);
    });

    it('un clic afuera cierra los dos desplegables', () => {
      (component as any).alternarMenuNotificaciones(new MouseEvent('click'));
      expect((component as any).menuNotificacionesAbierto()).toBe(true);

      (component as any).cerrarMenusFlotantes();
      expect((component as any).menuNotificacionesAbierto()).toBe(false);
      expect((component as any).menuPerfilAbierto()).toBe(false);
    });
  });
});
