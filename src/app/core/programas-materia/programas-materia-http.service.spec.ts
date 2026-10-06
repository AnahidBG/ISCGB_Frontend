import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { ContextoDocente } from './modelos/contexto-docente';
import { ProgramasMateriaHttpService } from './programas-materia-http.service';

describe('ProgramasMateriaHttpService: contexto del docente', () => {
  let servicio: ProgramasMateriaHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProgramasMateriaHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ProgramasMateriaHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function pedirContexto(): () => ContextoDocente | null {
    let contexto: ContextoDocente | null = null;
    servicio.obtenerContextoDocente(5).subscribe((c) => (contexto = c));
    return () => contexto;
  }

  it('si el backend manda formato y horas de la materia, los trae', () => {
    const contexto = pedirContexto();

    backend.expectOne(RUTAS_API.contextoDocente(5)).flush({
      idDocente: 2,
      materias: [
        {
          idMateria: 3,
          nombre: 'Programación I',
          carrera: 'Tecnicatura Superior en Desarrollo de Software',
          curso: 'Primer Año',
          idComision: 1,
          nombreComision: 'A',
          formato: 'A',
          horasCatedra: 5,
          horasTotales: 107,
        },
      ],
    });

    expect(contexto()?.materias[0]).toMatchObject({
      formato: 'Asignatura',
      horasCatedra: 5,
      horasTotales: 107,
    });
  });

  it('el backend de hoy no los manda: quedan en null', () => {
    const contexto = pedirContexto();

    backend.expectOne(RUTAS_API.contextoDocente(5)).flush({
      idDocente: 2,
      materias: [
        {
          idMateria: 3,
          nombre: 'Programación I',
          carrera: null,
          curso: null,
          idComision: 1,
          nombreComision: 'A',
        },
      ],
    });

    expect(contexto()?.materias[0]).toMatchObject({
      formato: null,
      horasCatedra: null,
      horasTotales: null,
    });
  });
});
