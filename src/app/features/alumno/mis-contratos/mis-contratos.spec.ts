import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import {
  ContratosService,
  MENSAJE_ERROR_LISTAR_CONTRATOS,
} from '../../../core/contratos/contratos.service';
import { ContratoAlumno } from '../../../core/contratos/modelos/contrato-alumno';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { MisContratos } from './mis-contratos';

const ALUMNA: Sesion = {
  token: 't',
  idUsuario: 12,
  nombreCompleto: 'Ana Alumna',
  dni: '40111222',
  email: 'ana@ejemplo.com',
  roles: ['Alumno'],
  venceEl: new Date(Date.now() + 60_000),
};

const CONTRATOS: ContratoAlumno[] = [
  {
    idContrato: 2,
    nombre: 'Convenio Beca Fundación Encode 2026',
    fechaCarga: new Date(2026, 9, 3),
  },
  { idContrato: 1, nombre: 'Acta de compromiso', fechaCarga: new Date(2026, 2, 15) },
];

describe('MisContratos (SCRUM-227)', () => {
  const misContratos = vi.fn();

  beforeEach(() => {
    misContratos.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(ALUMNA), cerrarSesion: () => {} } },
        {
          provide: CampanaService,
          useValue: {
            total: signal(0),
            detalle: signal<NotificacionPanel[]>([]),
            refrescar: () => {},
          },
        },
        { provide: ContratosService, useValue: { misContratos, descargar: () => of(new Blob()) } },
      ],
    });
  });

  async function pantalla() {
    const fixture = TestBed.createComponent(MisContratos);
    await fixture.whenStable();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  it('muestra los contratos que le cargaron, cada uno con su botón para descargarlo', async () => {
    misContratos.mockReturnValue(of(CONTRATOS));
    const { raiz } = await pantalla();

    const filas = [...raiz.querySelectorAll('[data-seccion="contratos"] li')];
    expect(filas.map((fila) => fila.textContent)).toEqual([
      expect.stringContaining('Convenio Beca Fundación Encode 2026'),
      expect.stringContaining('Acta de compromiso'),
    ]);
    expect(raiz.querySelectorAll('[data-seccion="contratos"] button')).toHaveLength(2);
  });

  it('si el pedido falla, lo dice y "Reintentar" lo vuelve a pedir', async () => {
    misContratos.mockReturnValueOnce(throwError(() => new Error(MENSAJE_ERROR_LISTAR_CONTRATOS)));
    misContratos.mockReturnValueOnce(of(CONTRATOS));
    const { fixture, raiz } = await pantalla();

    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_LISTAR_CONTRATOS,
    );

    raiz.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();

    expect(misContratos).toHaveBeenCalledTimes(2);
    expect(raiz.querySelector('[role="alert"]')).toBeNull();
    expect(raiz.querySelectorAll('[data-seccion="contratos"] li')).toHaveLength(2);
  });
});
