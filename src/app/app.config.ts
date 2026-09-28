import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AuthHttpService } from './core/auth/auth-http.service';
import { sesionInterceptor } from './core/auth/sesion.interceptor';
import { tokenInterceptor } from './core/auth/token.interceptor';
import { cargaInterceptor } from './core/carga/carga.interceptor';
import { CertificadosService } from './core/certificados/certificados.service';
import { CertificadosHttpService } from './core/certificados/certificados-http.service';
import { JustificativosService } from './core/justificativos/justificativos.service';
import { JustificativosHttpService } from './core/justificativos/justificativos-http.service';
import { LegajoService } from './core/legajos/legajo.service';
import { LegajoHttpService } from './core/legajos/legajo-http.service';
import { ProgramasMateriaService } from './core/programas-materia/programas-materia.service';
import { ReconocimientoSaberesService } from './core/reconocimiento-saberes/reconocimiento-saberes.service';
import { ReconocimientoSaberesHttpService } from './core/reconocimiento-saberes/reconocimiento-saberes-http.service';
import { ProgramasMateriaHttpService } from './core/programas-materia/programas-materia-http.service';
import { UsuariosService } from './core/usuarios/usuarios.service';
import { UsuariosHttpService } from './core/usuarios/usuarios-http.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

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

    // UsuariosHttpService: GET /api/Usuarios (real) y la gestión de usuarios
    // contra /api/UsuariosAdmin (rama CargaDeUsuarios del backend, todavía no
    // mergeada — sin ella, alta/modificación/baja avisan que no está
    // habilitada). Ver docs/contrato-alta-usuario.md.
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
