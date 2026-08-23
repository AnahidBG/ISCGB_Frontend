import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AuthMockService } from './core/auth/auth-mock.service';
import { ProgramasMateriaService } from './core/programas-materia/programas-materia.service';
import { ProgramasMateriaMockService } from './core/programas-materia/programas-materia-mock.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),

    
    { provide: AuthService, useClass: AuthMockService },
    { provide: ProgramasMateriaService, useClass: ProgramasMateriaMockService },
  ],
};
