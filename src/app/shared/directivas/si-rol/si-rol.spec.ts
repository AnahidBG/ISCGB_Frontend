import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { SiRol } from './si-rol';

function sesionCon(...roles: string[]): Sesion {
  return {
    token: 't',
    idUsuario: 1,
    nombreCompleto: 'Persona de Prueba',
    dni: '12345678',
    email: 'persona@ejemplo.com',
    roles,
    venceEl: new Date(Date.now() + 60_000),
  };
}

@Component({
  imports: [SiRol],
  template: `
    <p id="uno" *siRol="'Docente'">Para docentes</p>
    <p id="varios" *siRol="['Secretario', 'Director']">Para Secretaría y Dirección</p>
    <p id="ninguno" *siRol="[]">Para nadie</p>
  `,
})
class Anfitrion {}

describe('SiRol', () => {
  let sesion: ReturnType<typeof signal<Sesion | null>>;
  let fixture: ComponentFixture<Anfitrion>;

  /** Los ids de los párrafos que se están viendo. */
  const visibles = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p')).map((p) => p.id);

  async function montarConSesion(inicial: Sesion | null) {
    sesion = signal(inicial);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { sesion } }],
    });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
  }

  it('con un rol, muestra el contenido solo a quien lo tiene', async () => {
    await montarConSesion(sesionCon('Docente'));

    expect(visibles()).toEqual(['uno']);
  });

  it('con varios roles alcanza con tener uno de ellos', async () => {
    await montarConSesion(sesionCon('Director'));

    expect(visibles()).toEqual(['varios']);
  });

  it('con otro rol, sin sesión o con una lista vacía no muestra nada', async () => {
    await montarConSesion(sesionCon('Alumno'));
    expect(visibles()).toEqual([]);

    sesion.set(null);
    await fixture.whenStable();
    expect(visibles()).toEqual([]);
  });

  it('reacciona cuando cambia la sesión, sin recrear el componente', async () => {
    await montarConSesion(sesionCon('Alumno'));
    expect(visibles()).toEqual([]);

    sesion.set(sesionCon('Docente', 'Secretario'));
    await fixture.whenStable();
    expect(visibles()).toEqual(['uno', 'varios']);

    sesion.set(sesionCon('Alumno'));
    await fixture.whenStable();
    expect(visibles()).toEqual([]);
  });
});
