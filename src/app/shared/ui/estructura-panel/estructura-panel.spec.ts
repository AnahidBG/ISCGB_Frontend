import { Routes, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstructuraPanel, NotificacionPanel } from './estructura-panel';

const CLAVE_COLAPSADO = 'iscgb.panel.colapsado';

/** Cualquier URL existe: los tests tocan enlaces reales y no quieren un NG04002. */
const RUTAS_DE_PRUEBA: Routes = [{ path: '**', children: [] }];


describe('EstructuraPanel', () => {
  let component: EstructuraPanel;
  let fixture: ComponentFixture<EstructuraPanel>;

  beforeEach(async () => {
    localStorage.removeItem(CLAVE_COLAPSADO);

    await TestBed.configureTestingModule({
      imports: [EstructuraPanel],
      providers: [provideRouter(RUTAS_DE_PRUEBA)],
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

  /**
   * Regresión del bug real del 25/09/2026: con `nombreCompleto` vacío (pasa
   * cuando el usuario no tiene nombre/apellido cargados en la base — ver
   * `UsuarioController`), el botón del menú de la persona entero vivía
   * detrás de `@if (nombreUsuario())` y dejaba de existir en el DOM. Para
   * quien usaba el sistema, tocar ahí no hacía nada — no había nada que
   * tocar. Estos dos tests fijan que el botón siempre tenga algo que
   * mostrar, nunca que desaparezca.
   */
  it('con nombre vacío, las iniciales caen a "?" en vez de quedar en blanco', () => {
    fixture.componentRef.setInput('nombreUsuario', '');
    fixture.detectChanges();
    expect((component as any).iniciales()).toBe('?');
  });

  it('con nombre vacío, la etiqueta del menú de la persona sigue siendo legible', () => {
    fixture.componentRef.setInput('nombreUsuario', '');
    fixture.detectChanges();
    expect((component as any).etiquetaMenuPersona()).toBe('Menú de la cuenta');
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

    it('"no listadas" cuenta FILAS, no la diferencia con el número de la insignia', () => {
      // Caso Secretaría: una persona con 3 documentos = insignia 3, UNA fila.
      fixture.componentRef.setInput('notificaciones', 3);
      fixture.componentRef.setInput('notificacionesDetalle', [{ titulo: 'Juan Gómez' }]);
      fixture.detectChanges();

      expect((component as any).cantidadNotificaciones()).toBe(3);
      expect((component as any).notificacionesNoListadas()).toBe(0);
    });

    it('con más filas que el tope del desplegable, cuenta las que quedan afuera', () => {
      fixture.componentRef.setInput(
        'notificacionesDetalle',
        Array.from({ length: 8 }, (_, i) => ({ titulo: `Aviso ${i + 1}` })),
      );
      fixture.detectChanges();

      expect((component as any).notificacionesNoListadas()).toBe(3);
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

    it('Escape cierra los dos desplegables', () => {
      (component as any).alternarMenuNotificaciones(new MouseEvent('click'));
      expect((component as any).menuNotificacionesAbierto()).toBe(true);

      (component as any).cerrarMenusFlotantes();
      expect((component as any).menuNotificacionesAbierto()).toBe(false);
      expect((component as any).menuPerfilAbierto()).toBe(false);
    });
  });

  /**
   * El panel de la campana se cierra SOLO a propósito (la X, Escape, tocar la
   * campana, tocar un aviso o abrir el menú de la persona), nunca con un clic
   * afuera. Estos tests usan el DOM real para que el `document:click` del
   * `host` entre en juego: llamar a los métodos a mano no lo probaría.
   */
  describe('cierre de los desplegables del encabezado (DOM)', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const campana = () =>
      el().querySelector<HTMLButtonElement>('button[aria-label^="Notificaciones"]')!;
    const botonPersona = () =>
      el().querySelector<HTMLButtonElement>('button[aria-label^="Menú de"]')!;
    const botonX = () =>
      el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar notificaciones"]');
    const panelNotificaciones = () => el().querySelector('[role="menu"][aria-label="Notificaciones"]');
    const menuPerfil = () => el().querySelector('[role="menu"]:not([aria-label])');

    async function abrirCampana() {
      campana().click();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    beforeEach(() => {
      fixture.componentRef.setInput('notificacionesDetalle', [{ titulo: 'Rechazaron DNI' }]);
      fixture.detectChanges();
    });

    it('abrir la campana muestra el panel con su X', async () => {
      await abrirCampana();

      expect(panelNotificaciones()).not.toBeNull();
      expect(botonX()).not.toBeNull();
    });

    it('un clic afuera NO cierra el panel de notificaciones', async () => {
      await abrirCampana();

      document.body.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).not.toBeNull();
    });

    it('un clic adentro del panel tampoco lo cierra', async () => {
      await abrirCampana();

      panelNotificaciones()!.querySelector<HTMLElement>('p')!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).not.toBeNull();
    });

    it('la X cierra el panel', async () => {
      await abrirCampana();

      botonX()!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).toBeNull();
    });

    it('Escape cierra el panel', async () => {
      await abrirCampana();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).toBeNull();
    });

    it('tocar la campana de nuevo cierra el panel', async () => {
      await abrirCampana();

      campana().click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).toBeNull();
    });

    it('abrir el menú de la persona cierra el panel de notificaciones', async () => {
      await abrirCampana();

      botonPersona().click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(panelNotificaciones()).toBeNull();
      expect(menuPerfil()).not.toBeNull();
    });

    it('el menú de la persona SÍ se cierra con un clic afuera', async () => {
      botonPersona().click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(menuPerfil()).not.toBeNull();

      document.body.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(menuPerfil()).toBeNull();
    });
  });

  describe('menú de celular (cajón)', () => {
    it('Escape cierra el cajón', () => {
      (component as any).alternarMenu();
      expect((component as any).menuAbierto()).toBe(true);

      (component as any).cerrarConEscape();
      expect((component as any).menuAbierto()).toBe(false);
    });

    it('Escape además cierra los desplegables flotantes del encabezado', () => {
      (component as any).alternarMenuNotificaciones(new MouseEvent('click'));
      (component as any).alternarMenu();

      (component as any).cerrarConEscape();

      expect((component as any).menuAbierto()).toBe(false);
      expect((component as any).menuNotificacionesAbierto()).toBe(false);
      expect((component as any).menuPerfilAbierto()).toBe(false);
    });

    it('un clic afuera NO cierra el cajón — para eso está el fondo oscuro y la X', () => {
      (component as any).alternarMenu();

      (component as any).cerrarMenusFlotantes();

      expect((component as any).menuAbierto()).toBe(true);
    });
  });

  /**
   * Panel lateral con TODAS las notificaciones. Se abre desde "Ver todas" en el
   * desplegable de la campana. Igual que el desplegable, NO se cierra con un
   * clic afuera (decisión de la usuaria): X, Escape o tocar un aviso con enlace.
   */
  describe('panel lateral de notificaciones (DOM)', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const campana = () =>
      el().querySelector<HTMLButtonElement>('button[aria-label^="Notificaciones"]')!;
    const desplegable = () => el().querySelector('[role="menu"][aria-label="Notificaciones"]');
    const botonVerTodas = () =>
      Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find(
        (boton) => boton.textContent?.trim() === 'Ver todas',
      );
    const dialogo = () => el().querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const botonXPanel = () =>
      el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar panel de notificaciones"]');
    const filasDelDesplegable = () => desplegable()?.querySelectorAll('app-fila-notificacion');
    const filasDelPanel = () => dialogo()?.querySelectorAll('app-fila-notificacion');

    const avisos = (cuantos: number, conUrl = false): NotificacionPanel[] =>
      Array.from({ length: cuantos }, (_, i) => ({
        titulo: `Aviso ${i + 1}`,
        url: conUrl ? '/legajo/mis-documentos' : undefined,
      }));

    async function actualizar() {
      await fixture.whenStable();
      fixture.detectChanges();
    }

    async function cargar(notificacionesDetalle: NotificacionPanel[], insignia = 0) {
      fixture.componentRef.setInput('notificaciones', insignia);
      fixture.componentRef.setInput('notificacionesDetalle', notificacionesDetalle);
      fixture.detectChanges();
      campana().click();
      await actualizar();
    }

    async function abrirPanel() {
      botonVerTodas()!.click();
      await actualizar();
    }

    it('sin avisos no hay botón "Ver todas"', async () => {
      await cargar([]);

      expect(desplegable()).not.toBeNull();
      expect(botonVerTodas()).toBeUndefined();
    });

    it('con al menos un aviso aparece "Ver todas"', async () => {
      await cargar(avisos(1));

      expect(botonVerTodas()).toBeDefined();
    });

    it('con 8 avisos el desplegable muestra 5 filas y "Y 3 novedades más."; el panel muestra las 8', async () => {
      await cargar(avisos(8));

      expect(filasDelDesplegable()).toHaveLength(5);
      expect(desplegable()!.textContent).toContain('Y 3 novedades más.');

      await abrirPanel();

      expect(filasDelPanel()).toHaveLength(8);
    });

    it('con 6 avisos dice "Y 1 novedad más." (singular)', async () => {
      await cargar(avisos(6));

      expect(desplegable()!.textContent).toContain('Y 1 novedad más.');
    });

    it('con insignia 3 y UNA sola fila el desplegable NO dice que hay más', async () => {
      await cargar([{ titulo: 'Juan Gómez' }], 3);

      expect(filasDelDesplegable()).toHaveLength(1);
      expect(desplegable()!.textContent).not.toContain('más');
    });

    it('"Ver todas" cierra el desplegable y abre el panel', async () => {
      await cargar(avisos(2));
      expect(dialogo()).toBeNull();

      await abrirPanel();

      expect(desplegable()).toBeNull();
      expect(dialogo()).not.toBeNull();
    });

    it('la X del panel lo cierra', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      botonXPanel()!.click();
      await actualizar();

      expect(dialogo()).toBeNull();
    });

    it('Escape cierra el panel', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await actualizar();

      expect(dialogo()).toBeNull();
    });

    it('un clic en el fondo oscurecido NO lo cierra', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      el().querySelector<HTMLElement>('[data-fondo]')!.click();
      await actualizar();
      document.body.click();
      await actualizar();

      expect(dialogo()).not.toBeNull();
    });

    it('al abrir, el foco queda adentro del panel', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      expect(dialogo()!.contains(document.activeElement)).toBe(true);
    });

    it('al cerrar, el foco vuelve a la campana', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      botonXPanel()!.click();
      await actualizar();

      expect(document.activeElement).toBe(campana());
    });

    it('al cerrar con Escape, el foco también vuelve a la campana', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await actualizar();

      expect(document.activeElement).toBe(campana());
    });

    it('un aviso con url es un enlace y tocarlo cierra el panel', async () => {
      await cargar(avisos(2, true));
      await abrirPanel();

      const enlaces = dialogo()!.querySelectorAll<HTMLAnchorElement>('a');
      expect(enlaces).toHaveLength(2);
      enlaces[0].click();
      await actualizar();

      expect(dialogo()).toBeNull();
    });

    it('un aviso sin url no es un enlace', async () => {
      await cargar(avisos(2));
      await abrirPanel();

      expect(dialogo()!.querySelectorAll('a')).toHaveLength(0);
    });
  });
});
