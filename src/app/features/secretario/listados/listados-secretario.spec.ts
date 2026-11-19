import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { UsuarioInstitucional } from '../../../core/usuarios/modelos/usuario-institucional';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { ListadosSecretario } from './listados-secretario';

const USUARIOS: UsuarioInstitucional[] = [
  {
    idUsuario: 1,
    nombreCompleto: 'Ana Ruiz',
    dni: '30111222',
    email: 'ana@icgb.com.ar',
    roles: [ROLES.docente],
    activo: true,
    estadoLegajo: null,
  },
  {
    idUsuario: 2,
    nombreCompleto: 'Bruno Sosa',
    dni: '40111222',
    email: null,
    roles: [ROLES.alumno],
    activo: true,
    estadoLegajo: null,
  },
  {
    idUsuario: 3,
    nombreCompleto: 'Carla Díaz',
    dni: '20111222',
    email: null,
    roles: [ROLES.director],
    activo: true,
    estadoLegajo: null,
  },
];

describe('ListadosSecretario', () => {
  let pedidos: number;

  /** Cada pedido llama a la fuente con su número: 1 el primero, 2 el reintento… */
  async function montar(
    fuente: (pedido: number) => Observable<UsuarioInstitucional[]> = () => of(USUARIOS),
  ): Promise<ComponentFixture<ListadosSecretario>> {
    pedidos = 0;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(null), cerrarSesion: () => {} } },
        {
          provide: CampanaService,
          useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
        },
        { provide: UsuariosService, useValue: { listar: () => fuente(++pedidos) } },
      ],
    });
    const fixture = TestBed.createComponent(ListadosSecretario);
    await fixture.whenStable();
    return fixture;
  }

  function texto(fixture: ComponentFixture<ListadosSecretario>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function boton(fixture: ComponentFixture<ListadosSecretario>, etiqueta: string): HTMLButtonElement {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === etiqueta,
    )!;
  }

  it('muestra solo a docentes y alumnos, con la cantidad', async () => {
    const fixture = await montar();

    expect(texto(fixture)).toContain('Ana Ruiz');
    expect(texto(fixture)).toContain('Bruno Sosa');
    expect(texto(fixture)).not.toContain('Carla Díaz');
    expect(texto(fixture)).toContain('2 resultado(s)');
  });

  it('mientras el servidor no responde, muestra la espera', async () => {
    const fixture = await montar(() => NEVER);

    expect(texto(fixture)).toContain('Cargando personas…');
    expect(texto(fixture)).not.toContain('resultado(s)');
  });

  it('si la lista no se puede traer, lo dice y ofrece reintentar', async () => {
    const fixture = await montar(() => throwError(() => new Error('500')));

    expect(texto(fixture)).toContain('No pudimos traer el listado de alumnos y docentes.');
    expect(boton(fixture, 'Reintentar')).toBeDefined();
    expect(texto(fixture)).not.toContain('resultado(s)');
  });

  it('reintentar vuelve a pedir la lista y, si responde, la muestra', async () => {
    const fixture = await montar((pedido) =>
      pedido === 1 ? throwError(() => new Error('500')) : of(USUARIOS),
    );

    boton(fixture, 'Reintentar').click();
    await fixture.whenStable();

    expect(pedidos).toBe(2);
    expect(texto(fixture)).toContain('Ana Ruiz');
    expect(texto(fixture)).not.toContain('No pudimos traer el listado');
  });
});
