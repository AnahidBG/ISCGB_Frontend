import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AuthHttpService } from './core/auth/auth-http.service';
import { ProgramasMateriaService } from './core/programas-materia/programas-materia.service';
import { ProgramasMateriaHttpService } from './core/programas-materia/programas-materia-http.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),

    // Contra la API real en http://localhost:5231.
    // Para volver a datos falsos: AuthMockService / ProgramasMateriaMockService.
    { provide: AuthService, useClass: AuthHttpService },
    { provide: ProgramasMateriaService, useClass: ProgramasMateriaHttpService },
  ],
};
