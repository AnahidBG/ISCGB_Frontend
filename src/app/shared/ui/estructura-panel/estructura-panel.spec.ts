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
});
