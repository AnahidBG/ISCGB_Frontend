import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { ContratosService } from '../../../core/contratos/contratos.service';
import { ContratoAlumno, NuevoContrato } from '../../../core/contratos/modelos/contrato-alumno';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { UsuarioInstitucional } from '../../../core/usuarios/modelos/usuario-institucional';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { ContratosAlumnos } from './contratos-alumnos';

const SECRETARIO: Sesion = {
  token: 't',
  idUsuario: 2,
  nombreCompleto: 'Sergio Secretario',
  dni: '12345678',
  email: 'sergio@ejemplo.com',
  roles: ['Secretario'],
  venceEl: new Date(Date.now() + 60_000),
};

function persona(idUsuario: number, nombreCompleto: string, roles: string[], activo = true) {
  return {
    idUsuario,
    nombreCompleto,
    dni: String(idUsuario),
    email: null,
    roles,
    activo,
    estadoLegajo: null,
  } as UsuarioInstitucional;
}

const PDF = new File(['%PDF-1.4'], 'convenio.pdf', { type: 'application/pdf' });

let cargados: NuevoContrato[];

async function montar(): Promise<ComponentFixture<ContratosAlumnos>> {
  cargados = [];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(SECRETARIO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: {
          total: signal(0),
          detalle: signal<NotificacionPanel[]>([]),
          refrescar: () => {},
        },
      },
      {
        provide: UsuariosService,
        useValue: {
          listar: () =>
            of([
              persona(15, 'Zoe Alumna', ['Alumno']),
              persona(16, 'Ana Alumna', ['Alumno']),
              persona(17, 'Dora Docente', ['Docente']),
              persona(18, 'Beto Baja', ['Alumno'], false),
            ]),
        },
      },
      {
        provide: ContratosService,
        useValue: {
          cargar: (contrato: NuevoContrato) => {
            cargados.push(contrato);
            return of('Contrato cargado.');
          },
          listarDeAlumno: (): ReturnType<ContratosService['listarDeAlumno']> =>
            of<ContratoAlumno[]>(
              cargados.map((c, i) => ({
                idContrato: i + 1,
                nombre: c.nombre,
                fechaCarga: new Date(),
              })),
            ),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ContratosAlumnos);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<ContratosAlumnos>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('ContratosAlumnos (SCRUM-227)', () => {
  it('ofrece solo los alumnos activos, por orden alfabético', async () => {
    const fixture = await montar();

    const opciones = [...raiz(fixture).querySelectorAll('#contrato-alumno option')].map((o) =>
      o.textContent?.trim(),
    );
    expect(opciones.slice(1).map((texto) => texto?.split(' (')[0])).toEqual([
      'Ana Alumna',
      'Zoe Alumna',
    ]);
  });

  it('carga el contrato del alumno elegido y lo suma a su lista', async () => {
    const fixture = await montar();

    const alumno = raiz(fixture).querySelector<HTMLSelectElement>('#contrato-alumno')!;
    alumno.value = '15';
    alumno.dispatchEvent(new Event('change'));
    const nombre = raiz(fixture).querySelector<HTMLInputElement>('#contrato-nombre')!;
    nombre.value = 'Convenio Beca Fundación Encode';
    nombre.dispatchEvent(new Event('input'));
    const archivo = raiz(fixture).querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(archivo, 'files', { value: [PDF] });
    archivo.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(cargados).toEqual([
      { idUsuario: 15, nombre: 'Convenio Beca Fundación Encode', archivo: PDF },
    ]);
    expect(raiz(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Contrato cargado.',
    );
    expect(raiz(fixture).querySelector('[data-seccion="contratos"]')?.textContent).toContain(
      'Convenio Beca Fundación Encode',
    );
  });
});
