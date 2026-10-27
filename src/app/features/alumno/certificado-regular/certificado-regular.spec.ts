import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { CertificadosService } from '../../../core/certificados/certificados.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { CertificadoRegular } from './certificado-regular';

const ALUMNO: Sesion = {
  token: 't',
  idUsuario: 4,
  nombreCompleto: 'Pepito Algo',
  dni: '33333333',
  email: 'pepito@ejemplo.com',
  roles: ['Alumno'],
  rolesConId: [{ idRol: 4, nombreRol: 'Alumno' }],
  venceEl: new Date(Date.now() + 60_000),
};

async function montar(variante: string): Promise<ComponentFixture<CertificadoRegular>> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { data: { variante } },
          // Lo lee `EstructuraPanel` para el cartel de acceso denegado.
          queryParamMap: of(convertToParamMap({})),
        },
      },
      { provide: AuthService, useValue: { sesion: signal(ALUMNO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
      },
      { provide: CertificadosService, useValue: { descargar: () => EMPTY } },
    ],
  });
  const fixture = TestBed.createComponent(CertificadoRegular);
  await fixture.whenStable();
  return fixture;
}

describe('CertificadoRegular: cada variante lleva a la otra', () => {
  it.each([
    ['regular', '/alumno/certificado/regular-con-horario', 'certificado con horario'],
    ['regular-con-horario', '/alumno/certificado/regular', 'certificado sin horario'],
  ])('la variante %s enlaza a %s', async (variante, destino, texto) => {
    const fixture = await montar(variante);
    const contenido = (fixture.nativeElement as HTMLElement).querySelector('main')!;

    expect(contenido.querySelector(`a[href="${destino}"]`)?.textContent?.trim()).toBe(texto);
  });
});
