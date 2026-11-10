import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { MisDatos } from '../../../core/usuarios/modelos/mis-datos';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { MiPerfil } from './mi-perfil';

const SESION: Sesion = {
  token: 't',
  idUsuario: 5,
  nombreCompleto: 'Ana Pérez',
  dni: '12345678',
  email: 'ana@ejemplo.com',
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
  venceEl: new Date(Date.now() + 60_000),
};

const DETALLE: UsuarioDetalle = {
  idUsuario: 5,
  dni: '12345678',
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@ejemplo.com',
  telefono: '3511234567',
  telefonoEmergencia: null,
  lugarNacimiento: 'Villa Dolores',
  contactoEmergencia: null,
  direccion: 'Av. Siempreviva 742',
  idProvincia: 31,
  fechaNac: null,
  estadoUsuario: true,
  roles: ['Director', 'Docente'],
  rolesConId: [
    { idRol: 1, nombreRol: 'Director' },
    { idRol: 3, nombreRol: 'Docente' },
  ],
};

const PROVINCIAS: Provincia[] = [
  { idProvincia: 31, nombre: 'Córdoba', pais: 'Argentina' },
  { idProvincia: 32, nombre: 'Salta', pais: 'Argentina' },
];

/** Lo que se guardó y los correos que se pusieron en la sesión, en orden. */
let guardados: MisDatos[];
let correosDeSesion: string[];
/** Las fotos que se subieron y las que se pusieron en la sesión, en orden. */
let fotosSubidas: File[];
let fotosDeSesion: string[];

async function montar(
  guardar: (datos: MisDatos) => Observable<void> = () => of(undefined),
  subirFoto: (archivo: File) => Observable<string> = () =>
    of('http://localhost:5231/uploads/perfiles/nueva.png'),
): Promise<ComponentFixture<MiPerfil>> {
  guardados = [];
  correosDeSesion = [];
  fotosSubidas = [];
  fotosDeSesion = [];

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          sesion: signal(SESION),
          cerrarSesion: () => {},
          actualizarCorreo: (correo: string) => correosDeSesion.push(correo),
          actualizarFoto: (url: string) => fotosDeSesion.push(url),
        },
      },
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
          obtener: (idUsuario: number) => {
            expect(idUsuario).toBe(SESION.idUsuario);
            return of(DETALLE);
          },
          listarProvincias: () => of(PROVINCIAS),
          actualizarMiPerfil: (datos: MisDatos) => {
            guardados.push(datos);
            return guardar(datos);
          },
          subirFotoPerfil: (archivo: File) => {
            fotosSubidas.push(archivo);
            return subirFoto(archivo);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(MiPerfil);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<MiPerfil>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function campo<T extends HTMLElement>(fixture: ComponentFixture<MiPerfil>, nombre: string): T {
  return raiz(fixture).querySelector(`#mis-datos-${nombre}`) as T;
}

function botonGuardar(fixture: ComponentFixture<MiPerfil>): HTMLButtonElement {
  return raiz(fixture).querySelector('form button[type="submit"]') as HTMLButtonElement;
}

describe('MiPerfil', () => {
  it('muestra lo que no se edita y precarga el formulario con los datos actuales', async () => {
    const fixture = await montar();
    const texto = raiz(fixture).textContent ?? '';

    expect(raiz(fixture).querySelector('h1')?.textContent).toContain('Mi perfil');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('12.345.678');
    expect(texto).toContain('Director, Docente');
    expect(texto).toContain('Estos datos los actualiza Dirección.');

    expect(campo<HTMLInputElement>(fixture, 'email').value).toBe('ana@ejemplo.com');
    expect(campo<HTMLInputElement>(fixture, 'telefono').value).toBe('3511234567');
    expect(campo<HTMLInputElement>(fixture, 'telefonoEmergencia').value).toBe('');
    expect(campo<HTMLInputElement>(fixture, 'direccion').value).toBe('Av. Siempreviva 742');
    expect(campo<HTMLSelectElement>(fixture, 'idProvincia').value).toBe('31');
    // Sin nada que guardar, el botón está apagado.
    expect(botonGuardar(fixture).disabled).toBe(true);
  });

  it('al guardar manda los datos, avisa y deja el correo nuevo en la sesión', async () => {
    const fixture = await montar();

    const correo = campo<HTMLInputElement>(fixture, 'email');
    correo.value = ' nueva@ejemplo.com ';
    correo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(botonGuardar(fixture).disabled).toBe(false);

    raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(guardados).toEqual([
      {
        email: 'nueva@ejemplo.com',
        telefono: '3511234567',
        telefonoEmergencia: '',
        contactoEmergencia: '',
        direccion: 'Av. Siempreviva 742',
        lugarNacimiento: 'Villa Dolores',
        idProvincia: 31,
      },
    ]);
    expect(correosDeSesion).toEqual(['nueva@ejemplo.com']);
    expect(raiz(fixture).querySelector('main [role="status"]')?.textContent).toContain(
      'Tus datos se actualizaron.',
    );
    // Lo guardado es el nuevo punto de partida: vuelve a no haber nada para guardar.
    expect(campo<HTMLInputElement>(fixture, 'email').value).toBe('nueva@ejemplo.com');
    expect(botonGuardar(fixture).disabled).toBe(true);
  });

  describe('foto de perfil', () => {
    /** Elige un archivo en el `<input type="file">`, como lo haría la persona. */
    async function elegirFoto(fixture: ComponentFixture<MiPerfil>, archivo: File) {
      const entrada = raiz(fixture).querySelector<HTMLInputElement>('#foto-perfil')!;
      Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
      entrada.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    function seccionFoto(fixture: ComponentFixture<MiPerfil>): HTMLElement {
      return raiz(fixture).querySelector('[data-seccion="foto"]') as HTMLElement;
    }

    it('sube la foto elegida, la pone en la sesión y lo confirma', async () => {
      const fixture = await montar();
      const foto = new File([new Uint8Array(10)], 'yo.png', { type: 'image/png' });

      await elegirFoto(fixture, foto);

      expect(fotosSubidas).toEqual([foto]);
      expect(fotosDeSesion).toEqual(['http://localhost:5231/uploads/perfiles/nueva.png']);
      expect(seccionFoto(fixture).querySelector('[role="status"]')?.textContent).toContain(
        'Tu foto se actualizó.',
      );
    });

    it('un archivo que no es JPG ni PNG no se sube y explica por qué', async () => {
      const fixture = await montar();

      await elegirFoto(fixture, new File([new Uint8Array(10)], 'yo.gif', { type: 'image/gif' }));

      expect(fotosSubidas).toEqual([]);
      expect(seccionFoto(fixture).querySelector('[role="alert"]')?.textContent).toContain(
        'JPG o PNG',
      );
    });

    it('si el backend rechaza la foto muestra su mensaje y no toca la sesión', async () => {
      const fixture = await montar(undefined, () =>
        throwError(() => new Error('Formato no válido. Solo se permiten JPG y PNG.')),
      );

      await elegirFoto(fixture, new File([new Uint8Array(10)], 'yo.png', { type: 'image/png' }));

      expect(fotosDeSesion).toEqual([]);
      expect(seccionFoto(fixture).querySelector('[role="alert"]')?.textContent).toContain(
        'Formato no válido',
      );
    });
  });
});
