import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ContratosMockService } from './contratos-mock.service';

describe('ContratosMockService', () => {
  it('lo que carga Secretaría lo ve el alumno de la sesión, y nadie más', async () => {
    const sesion = signal<{ idUsuario: number } | null>({ idUsuario: 15 });
    TestBed.configureTestingModule({
      providers: [ContratosMockService, { provide: AuthService, useValue: { sesion } }],
    });
    const servicio = TestBed.inject(ContratosMockService);
    const archivo = new File(['%PDF-1.4'], 'convenio.pdf', { type: 'application/pdf' });

    expect(await firstValueFrom(servicio.misContratos())).toEqual([]);

    await firstValueFrom(servicio.cargar({ idUsuario: 15, nombre: 'Convenio Beca', archivo }));

    const delAlumno = await firstValueFrom(servicio.misContratos());
    expect(delAlumno.map((c) => c.nombre)).toEqual(['Convenio Beca']);
    expect(await firstValueFrom(servicio.descargar(delAlumno[0].idContrato))).toBe(archivo);

    sesion.set({ idUsuario: 16 });
    expect(await firstValueFrom(servicio.misContratos())).toEqual([]);
  });
});
