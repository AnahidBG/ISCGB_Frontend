import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { ContextoDocente } from '../../../core/programas-materia/modelos/contexto-docente';
import { ProgramaMateria } from '../../../core/programas-materia/modelos/programa-materia';
import { ProgramasMateriaService } from '../../../core/programas-materia/programas-materia.service';
import { EntregaPrograma } from './entrega-programa';

const CONTEXTO: ContextoDocente = {
  idDocente: 2,
  materias: [
    {
      idMateria: 3,
      nombre: 'Programación I',
      carrera: null,
      curso: null,
      idComision: 1,
      nombreComision: 'A',
      formato: null,
      horasCatedra: null,
      horasTotales: null,
    },
  ],
};

const MENSAJE_SALIDA = 'Olvidaste enviarlo, ¿seguro querés salir?';

type EntregaProgramaExpuesta = {
  confirmarSalida(): boolean | Promise<boolean>;
  manejarEnvio(programa: ProgramaMateria): void;
  cerrarSesion(): void;
};

describe('EntregaPrograma: salir sin enviar', () => {
  let fixture: ComponentFixture<EntregaPrograma>;
  let cerrarSesion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    cerrarSesion = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            sesion: signal({ idUsuario: 5, nombreCompleto: 'Milena Previgliano', roles: ['Docente'] }),
            cerrarSesion,
          },
        },
        {
          provide: CampanaService,
          useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
        },
        {
          provide: ProgramasMateriaService,
          useValue: {
            obtenerContextoDocente: () => of(CONTEXTO),
            enviarPrograma: () => of(1),
            descargarPdf: () => of(new Blob()),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(EntregaPrograma);
    await fixture.whenStable();
  });

  const pantalla = () => fixture.componentInstance as unknown as EntregaProgramaExpuesta;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function escribirAlgo(): Promise<void> {
    const fundamentacion = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '#fundamentacion',
    )!;
    fundamentacion.value = 'Esta materia…';
    fundamentacion.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function botonQueDice(etiqueta: string): HTMLButtonElement {
    const botones = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    return botones.find((b) => b.textContent?.trim() === etiqueta)!;
  }

  it('sin nada cargado deja salir sin preguntar', () => {
    expect(pantalla().confirmarSalida()).toBe(true);
    expect(texto()).not.toContain(MENSAJE_SALIDA);
  });

  it('con algo cargado pregunta, y "Seguir completando" lo deja en la pantalla', async () => {
    await escribirAlgo();

    const respuesta = pantalla().confirmarSalida();
    await fixture.whenStable();
    expect(texto()).toContain(MENSAJE_SALIDA);

    botonQueDice('Seguir completando').click();
    await fixture.whenStable();

    await expect(respuesta).resolves.toBe(false);
    expect(texto()).not.toContain(MENSAJE_SALIDA);
  });

  it('si elige "Salir sin enviar", sale', async () => {
    await escribirAlgo();

    const respuesta = pantalla().confirmarSalida();
    await fixture.whenStable();
    botonQueDice('Salir sin enviar').click();

    await expect(respuesta).resolves.toBe(true);
  });

  it('después de enviar con éxito ya no pregunta', async () => {
    await escribirAlgo();

    pantalla().manejarEnvio({} as ProgramaMateria);
    await fixture.whenStable();

    expect(pantalla().confirmarSalida()).toBe(true);
  });

  it('cerrar o recargar la pestaña con algo cargado pide confirmación al navegador', async () => {
    const limpia = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(limpia);
    expect(limpia.defaultPrevented).toBe(false);

    await escribirAlgo();

    const conCambios = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(conCambios);
    expect(conCambios.defaultPrevented).toBe(true);
  });

  it('cerrar sesión no corta la sesión si la persona elige quedarse', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(false);

    pantalla().cerrarSesion();
    await fixture.whenStable();

    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  it('cerrar sesión la corta una vez que la navegación al login se concretó', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    pantalla().cerrarSesion();
    await fixture.whenStable();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });
});
