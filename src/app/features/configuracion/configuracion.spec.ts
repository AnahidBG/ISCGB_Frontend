import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  AuthService,
  MENSAJE_ERROR_RECUPERACION,
  MENSAJE_SIN_CONEXION,
} from '../../core/auth/auth.service';
import { Sesion } from '../../core/auth/modelos/sesion';
import { CampanaService } from '../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../core/notificaciones/modelos/notificacion-panel';
import { routes } from '../../app.routes';
import { Configuracion } from './configuracion';

const SESION: Sesion = {
  token: 't',
  idUsuario: 5,
  nombreCompleto: 'Ana Pérez',
  dni: '12.345.678',
  email: 'ana@ejemplo.com',
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
  venceEl: new Date(Date.now() + 60_000),
};

describe('Configuracion', () => {
  let fixture: ComponentFixture<Configuracion>;
  let solicitarRecuperacion: ReturnType<typeof vi.fn>;
  let el: HTMLElement;

  async function montar(sesion: Sesion = SESION): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { sesion: signal(sesion), cerrarSesion: () => {}, solicitarRecuperacion },
        },
        {
          provide: CampanaService,
          useValue: {
            total: signal(0),
            detalle: signal<NotificacionPanel[]>([]),
            refrescar: () => {},
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Configuracion);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll('button')).find((candidato) =>
      candidato.textContent?.includes(texto),
    )!;
  }

  async function pedirEnlace(): Promise<void> {
    boton('Enviarme el enlace').click();
    await fixture.whenStable();
  }

  beforeEach(() => {
    solicitarRecuperacion = vi.fn(() => of(undefined));
  });

  it('ya no pide la contraseña actual: explica que el cambio es con un enlace por mail', async () => {
    await montar();

    expect(el.querySelector('h1')?.textContent).toContain('Configuración');
    expect(el.textContent).toContain('Cambiar contraseña');
    expect(el.querySelector('input[type="password"]')).toBeNull();
    expect(el.textContent).toContain('ana@ejemplo.com');
    expect(el.textContent).toMatch(/vence en 1\s+hora/);
  });

  it('sin correo en la sesión habla del correo registrado, sin dejar un hueco', async () => {
    await montar({ ...SESION, email: '' });

    expect(el.textContent).toContain('al correo que tenés registrado');
  });

  it('pide el enlace con el DNI de la sesión, limpio, una sola vez', async () => {
    await montar();

    await pedirEnlace();

    expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
    expect(solicitarRecuperacion).toHaveBeenCalledWith('12345678');
  });

  it('éxito: confirma a qué correo se mandó y permite volver a enviarlo', async () => {
    await montar();

    await pedirEnlace();

    expect(el.querySelector('[role="status"]')?.textContent).toContain('ana@ejemplo.com');
    expect(el.textContent).toContain('Te enviamos el enlace');

    boton('Enviar de nuevo').click();
    await fixture.whenStable();

    expect(boton('Enviarme el enlace')).toBeDefined();
  });

  it('un segundo clic mientras se envía no dispara otra llamada', async () => {
    solicitarRecuperacion.mockReturnValue(new Subject<void>());
    await montar();

    await pedirEnlace();
    await pedirEnlace();

    expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
  });

  it.each([MENSAJE_SIN_CONEXION, MENSAJE_ERROR_RECUPERACION])(
    'si falla con "%s" lo muestra y deja reintentar',
    async (mensaje) => {
      solicitarRecuperacion.mockReturnValueOnce(throwError(() => new Error(mensaje)));
      await montar();

      await pedirEnlace();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain(mensaje);

      await pedirEnlace();
      expect(solicitarRecuperacion).toHaveBeenCalledTimes(2);
    },
  );

  it('ofrece elegir la apariencia, con las tres opciones y una explicación', async () => {
    await montar();
    const tarjeta = el.querySelector('section[aria-labelledby="titulo-apariencia"]')!;

    expect(tarjeta.querySelector('h2')?.textContent).toContain('Apariencia');
    expect(tarjeta.textContent).toContain('Automático');
    expect(tarjeta.querySelectorAll('app-selector-tema button').length).toBe(3);
    expect(tarjeta.textContent).toContain('configuración de tu dispositivo');
  });

  it('usa los colores del tema, sin hexadecimales escritos a mano en las clases', async () => {
    await montar();
    const tarjeta = el.querySelector('section[aria-labelledby="titulo-cambiar-contrasena"]')!;

    expect(tarjeta.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,6}\]/);
  });
});

describe('ruta configuracion', () => {
  const ruta = routes.find((candidata) => candidata.path === 'configuracion');

  it('ya no es "Próximamente": carga la pantalla de Configuración, solo con sesión', async () => {
    expect(ruta?.canActivate?.length).toBe(1);
    expect(ruta?.data).toBeUndefined();
    expect(await ruta!.loadComponent!()).toBe(Configuracion);
  });
});
