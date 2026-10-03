import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { FormularioPerfilUsuario } from '../partes/formulario-perfil-usuario/formulario-perfil-usuario';
import { EditarUsuario } from './editar-usuario';

const PROVINCIAS: Provincia[] = [
  { idProvincia: 31, nombre: 'Córdoba', pais: 'Argentina' },
  { idProvincia: 55, nombre: 'Colonia', pais: 'Uruguay' },
];

const DETALLE: UsuarioDetalle = {
  idUsuario: 9,
  dni: '12345678',
  nombre: 'María',
  apellido: 'Gómez',
  email: 'maria@ejemplo.com',
  telefono: null,
  telefonoEmergencia: null,
  lugarNacimiento: null,
  contactoEmergencia: null,
  direccion: null,
  idProvincia: 55,
  fechaNac: null,
  estadoUsuario: true,
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
};

describe('EditarUsuario', () => {
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
        { provide: ActivatedRoute, useValue: {
            snapshot: { paramMap: { get: () => '9' } },
            queryParamMap: of(convertToParamMap({})),
          },
        },
        { provide: AuthService, useValue: { sesion: signal(null), cerrarSesion: () => {} } },
        { provide: CampanaService, useValue: campana },
        {
          provide: UsuariosService,
          useValue: {
            obtener: (): Observable<UsuarioDetalle> => of(DETALLE),
            listarProvincias: (): Observable<Provincia[]> => {
              llamadas++;
              return pedidoProvincias;
            },
          },
        },
      ],
    });
  });

  it('pide las provincias y se las pasa al formulario aunque lleguen después del usuario', async () => {
    const fixture = TestBed.createComponent(EditarUsuario);
    await fixture.whenStable();
    const hijo = fixture.debugElement.query(
      (d) => d.componentInstance instanceof FormularioPerfilUsuario,
    ).componentInstance as FormularioPerfilUsuario;

    expect(llamadas).toBe(1);
    expect(hijo.cargandoProvincias()).toBe(true);

    pedidoProvincias.next(PROVINCIAS);
    pedidoProvincias.complete();
    await fixture.whenStable();

    expect(hijo.provincias()).toEqual(PROVINCIAS);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#idProvincia');
    expect(select.value).toBe('55');
  });

  it('si el pedido de provincias falla, el formulario lo muestra y sigue visible', async () => {
    const fixture = TestBed.createComponent(EditarUsuario);
    await fixture.whenStable();

    pedidoProvincias.error(new Error('boom'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las provincias');
    expect(fixture.nativeElement.querySelector('#nombre')).not.toBeNull();
  });

  it('pide el refresco de la campana y le pasa al encabezado el total y el detalle del servicio', async () => {
    const fixture = TestBed.createComponent(EditarUsuario);
    await fixture.whenStable();
    const encabezado = fixture.debugElement.query(
      (d) => d.componentInstance instanceof EstructuraPanel,
    ).componentInstance as EstructuraPanel;

    expect(campana.refrescar).toHaveBeenCalledTimes(1);
    expect(encabezado.notificaciones()).toBe(3);
    expect(encabezado.notificacionesDetalle()).toEqual(AVISOS);
  });
});
