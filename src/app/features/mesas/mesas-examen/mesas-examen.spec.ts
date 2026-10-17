import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { CalendarioExamenesService } from '../../../core/examenes/calendario-examenes.service';
import { MateriasService } from '../../../core/materias/materias.service';
import { MesasExamenService } from '../../../core/mesas/mesas-examen.service';
import { NuevaMesa } from '../../../core/mesas/modelos/nueva-mesa';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { MesasExamen } from './mesas-examen';

const SECRETARIO: Sesion = {
  token: 't',
  idUsuario: 2,
  nombreCompleto: 'Sergio Secretario',
  dni: '12345678',
  email: 'sergio@ejemplo.com',
  roles: ['Secretario'],
  rolesConId: [{ idRol: 2, nombreRol: 'Secretario' }],
  venceEl: new Date(Date.now() + 60_000),
};

/** Las mesas que se mandaron a crear, en orden. */
let creadas: NuevaMesa[];

async function montar(opciones: {
  materias?: () => Observable<{ idMateria: number; nombre: string }[]>;
  registrar?: () => Observable<string>;
} = {}): Promise<ComponentFixture<MesasExamen>> {
  creadas = [];
  const registrar = opciones.registrar ?? (() => of('Mesa de examen registrada exitosamente.'));

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(SECRETARIO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
      },
      {
        provide: MateriasService,
        useValue: {
          listarDisponibles: opciones.materias ?? (() => of([{ idMateria: 4, nombre: 'Redes' }])),
          listarComisiones: () => of([{ idComision: 1, nombre: 'Comisión A' }]),
          listarDocentes: () => of([{ idDocente: 8, nombreCompleto: 'Ana Pérez' }]),
        },
      },
      {
        provide: CalendarioExamenesService,
        useValue: { tiposDeExamen: () => of([{ idTipoExamen: 3, nombre: 'Final' }]) },
      },
      {
        provide: MesasExamenService,
        useValue: {
          registrarMesa: (mesa: NuevaMesa) => {
            creadas.push(mesa);
            return registrar();
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(MesasExamen);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<MesasExamen>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Un día de acá a un mes, siempre en el futuro. */
function diaFuturo(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 30);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`;
}

async function crearMesa(fixture: ComponentFixture<MesasExamen>, dia = diaFuturo()) {
  const valores: Record<string, string> = {
    'mesa-dia': dia,
    'mesa-horario': '09:00',
    'mesa-materia': '4',
    'mesa-comision': '1',
    'mesa-tipo': '3',
    'mesa-docente': '8',
  };
  for (const [id, valor] of Object.entries(valores)) {
    const control = raiz(fixture).querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
  }
  raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('MesasExamen (SCRUM-245)', () => {
  it('arma los desplegables con las materias, comisiones, tipos y docentes', async () => {
    const fixture = await montar();

    const texto = (id: string) => raiz(fixture).querySelector(`#${id}`)?.textContent ?? '';
    expect(texto('mesa-materia')).toContain('Redes');
    expect(texto('mesa-comision')).toContain('Comisión A');
    expect(texto('mesa-tipo')).toContain('Final');
    expect(texto('mesa-docente')).toContain('Ana Pérez');
  });

  it('crea la mesa, confirma con el mensaje del backend y deja el formulario vacío', async () => {
    const fixture = await montar();
    const dia = diaFuturo();

    await crearMesa(fixture, dia);

    expect(creadas).toEqual([
      { dia, horario: '09:00', idMateria: 4, idComision: 1, idTipoExamen: 3, idDocente: 8 },
    ]);
    expect(raiz(fixture).querySelector('form [role="status"]')?.textContent).toContain(
      'Mesa de examen registrada exitosamente.',
    );
    expect(raiz(fixture).querySelector<HTMLSelectElement>('#mesa-docente')?.value).toBe('');
  });

  it('si el backend la rechaza muestra su mensaje', async () => {
    const fixture = await montar({
      registrar: () => throwError(() => new Error('El docente seleccionado no existe.')),
    });

    await crearMesa(fixture);

    expect(raiz(fixture).querySelector('form [role="alert"]')?.textContent).toContain(
      'El docente seleccionado no existe.',
    );
  });

  it('si no se pueden traer las listas lo avisa, y "Reintentar" las vuelve a pedir', async () => {
    let pedidos = 0;
    const fixture = await montar({
      materias: () =>
        ++pedidos === 1
          ? throwError(() => new Error('No pudimos traer las materias del instituto.'))
          : of([{ idMateria: 4, nombre: 'Redes' }]),
    });

    expect(raiz(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos traer las materias',
    );

    raiz(fixture).querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();

    expect(raiz(fixture).querySelector('#mesa-materia')?.textContent).toContain('Redes');
  });
});
