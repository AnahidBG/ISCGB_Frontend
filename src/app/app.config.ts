import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AuthHttpService } from './core/auth/auth-http.service';
import { sesionInterceptor } from './core/auth/sesion.interceptor';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { BusquedaService } from './core/busqueda/busqueda.service';
import { BusquedaHttpService } from './core/busqueda/busqueda-http.service';
import { cargaInterceptor } from './core/carga/carga.interceptor';
import { CertificadosService } from './core/certificados/certificados.service';
import { CertificadosHttpService } from './core/certificados/certificados-http.service';
import { CalendarioExamenesService } from './core/examenes/calendario-examenes.service';
import { CalendarioExamenesHttpService } from './core/examenes/calendario-examenes-http.service';
import { JustificativosService } from './core/justificativos/justificativos.service';
import { JustificativosHttpService } from './core/justificativos/justificativos-http.service';
import { LegajoService } from './core/legajos/legajo.service';
import { LegajoHttpService } from './core/legajos/legajo-http.service';
import { MateriasService } from './core/materias/materias.service';
import { MateriasHttpService } from './core/materias/materias-http.service';
import { MesasExamenService } from './core/mesas/mesas-examen.service';
import { MesasExamenHttpService } from './core/mesas/mesas-examen-http.service';
import { FrecuenciaAvisosService } from './core/notificaciones/frecuencia-avisos.service';
import { FrecuenciaAvisosHttpService } from './core/notificaciones/frecuencia-avisos-http.service';
import { ProgramasMateriaService } from './core/programas-materia/programas-materia.service';
import { ReconocimientoSaberesService } from './core/reconocimiento-saberes/reconocimiento-saberes.service';
import { ReconocimientoSaberesHttpService } from './core/reconocimiento-saberes/reconocimiento-saberes-http.service';
import { ProgramasMateriaHttpService } from './core/programas-materia/programas-materia-http.service';
import { UsuariosService } from './core/usuarios/usuarios.service';
import { UsuariosHttpService } from './core/usuarios/usuarios-http.service';

// Los datos del español de Argentina para `DatePipe` y `formatDate`: nombres de
// días y meses, formatos y primer día de la semana. Sin esto, Angular formatea
// en inglés. Se registra una vez, antes de arrancar.
registerLocaleData(localeEsAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'es-AR' },

    // El ORDEN de los interceptores importa: se ejecutan en el orden de este
    // arreglo. `tokenInterceptor` va primero para que el pedido ya salga con
    // el header puesto; `sesionInterceptor` mira la respuesta (401 → sesión
    // vencida, 403 → acceso denegado); `cargaInterceptor` envuelve el
    // resultado para mostrar el logo de espera. Una llamada puntual puede
    // quedar afuera del loader marcándola con SIN_CARGA_GLOBAL — ver
    // core/carga/carga.interceptor.ts.
    provideHttpClient(
      withFetch(),
      withInterceptors([tokenInterceptor, sesionInterceptor, cargaInterceptor]),
    ),

    // ── Todo contra la API real en http://localhost:5231 ──────────────────
    // Cada uno de estos tiene una versión con datos falsos al lado
    // (*MockService) para poder seguir trabajando con el backend caído.
    // Cambiar de una a otra es cambiar la clase de esta línea y nada más.

    { provide: AuthService, useClass: AuthHttpService },
    { provide: ProgramasMateriaService, useClass: ProgramasMateriaHttpService },
    { provide: JustificativosService, useClass: JustificativosHttpService },
    { provide: CertificadosService, useClass: CertificadosHttpService },
    { provide: ReconocimientoSaberesService, useClass: ReconocimientoSaberesHttpService },
    { provide: MateriasService, useClass: MateriasHttpService },
    { provide: BusquedaService, useClass: BusquedaHttpService },
    { provide: FrecuenciaAvisosService, useClass: FrecuenciaAvisosHttpService },
    { provide: CalendarioExamenesService, useClass: CalendarioExamenesHttpService },
    { provide: MesasExamenService, useClass: MesasExamenHttpService },

    // UsuariosHttpService: GET /api/Usuarios (real) y gestión de usuarios
    // contra /api/UsuariosAdmin. Ver docs/contrato-api.md y
    // docs/contrato-alta-usuario.md.
    { provide: UsuariosService, useClass: UsuariosHttpService },

    // LegajoHttpService: desde el 30/08/2026 las SEIS operaciones pegan
    // contra la API real — no le queda ni un dato inventado. Las dos últimas
    // en llegar fueron `GET /api/Legajos/pendientes` y
    // `GET /api/Legajos/resumen-estado`, que son las que usa "Control de
    // Legajos". Para trabajar con el backend caído: cambiar SOLO esta línea
    // a `useClass: LegajoMockService` (importarlo de
    // `./core/legajos/legajo-mock.service`).
    { provide: LegajoService, useClass: LegajoHttpService },
  ],
};
