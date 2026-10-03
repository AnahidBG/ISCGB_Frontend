import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PerfilUsuario } from '../../../core/usuarios/modelos/perfil-usuario';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { FormularioPerfilUsuario } from '../partes/formulario-perfil-usuario/formulario-perfil-usuario';
import { AltaUsuario } from './alta-usuario';

const PROVINCIAS: Provincia[] = [{ idProvincia: 31, nombre: 'Córdoba', pais: 'Argentina' }];

describe('AltaUsuario', () => {
  const AVISOS: NotificacionPanel[] = [{ titulo: 'Rechazaron DNI', tono: 'rechazado' }];
  const campana = {
    total: signal(3),
    detalle: signal<NotificacionPanel[]>(AVISOS),
    refrescar: vi.fn(),
  };

  let pedidoProvincias: Subject<Provincia[]>;
  let llamadas: number;

  beforeEach(() => {
    campana.refrescar.mockClear();
    pedidoProvincias = new Subject<Provincia[]>();
    llamadas = 0;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(null), cerrarSesion: () => {} } },
        { provide: CampanaService, useValue: campana },
        {
          provide: UsuariosService,
          useValue: {
            listarProvincias: (): Observable<Provincia[]> => {
              llamadas++;
              return pedidoProvincias;
            },
            crear: (): Observable<string> =>
              of('Usuario creado. Se envió un correo para configurar la contraseña.'),
          },
        },
      ],
    });
  });

  async function instanciaDelFormulario() {
    const fixture = TestBed.createComponent(AltaUsuario);
    await fixture.whenStable();
    const hijo = fixture.debugElement.query((d) => d.componentInstance instanceof FormularioPerfilUsuario);
    return { fixture, hijo: hijo.componentInstance as FormularioPerfilUsuario };
  }

  it('pide las provincias al servicio y se las pasa al formulario', async () => {
    const { fixture, hijo } = await instanciaDelFormulario();
    expect(llamadas).toBe(1);
    expect(hijo.cargandoProvincias()).toBe(true);

    pedidoProvincias.next(PROVINCIAS);
    pedidoProvincias.complete();
    await fixture.whenStable();

    expect(hijo.provincias()).toEqual(PROVINCIAS);
    expect(hijo.cargandoProvincias()).toBe(false);
    expect(hijo.falloProvincias()).toBe(false);
  });

  it('si el pedido falla, avisa al formulario y la pantalla sigue', async () => {
    const { fixture, hijo } = await instanciaDelFormulario();

    pedidoProvincias.error(new Error('boom'));
    await fixture.whenStable();

    expect(hijo.falloProvincias()).toBe(true);
    expect(hijo.cargandoProvincias()).toBe(false);
  });

  // El alta ya no deja una contraseña provisoria inservible: el backend manda
  // un enlace por correo y la persona crea la suya en `/crear-password`. La
  // confirmación tiene que decirle eso al Director, no mandarlo a pedirle una
  // clave al equipo técnico.
  it('al crear, la confirmación explica que la contraseña se crea desde el correo', async () => {
    const { fixture, hijo } = await instanciaDelFormulario();

    hijo.guardar.emit({ nombre: 'Ana', apellido: 'Gómez' } as PerfilUsuario);
    await fixture.whenStable();

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Ana Gómez ya está en el sistema');
    expect(texto).toContain('crear su contraseña');
    expect(texto).toContain('correo');
    expect(texto).not.toContain('equipo técnico');
    expect(texto).not.toContain('provisoria');
  });

  it('pide el refresco de la campana y le pasa al encabezado el total y el detalle del servicio', async () => {
    const fixture = TestBed.createComponent(AltaUsuario);
    await fixture.whenStable();
    const encabezado = fixture.debugElement.query(
      (d) => d.componentInstance instanceof EstructuraPanel,
    ).componentInstance as EstructuraPanel;

    expect(campana.refrescar).toHaveBeenCalledTimes(1);
    expect(encabezado.notificaciones()).toBe(3);
    expect(encabezado.notificacionesDetalle()).toEqual(AVISOS);
  });
});
