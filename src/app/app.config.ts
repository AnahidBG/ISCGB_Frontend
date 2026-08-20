import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AuthMockService } from './core/auth/auth-mock.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),

    // ─────────────────────────────────────────────────────────────────────
    //  ⚙️  DE DÓNDE SALEN LOS DATOS DE AUTENTICACIÓN
    //
    //  Esta línea es el interruptor entre trabajar con datos inventados y
    //  trabajar contra la API de verdad.
    //
    //  Para desarrollar sin backend (lo que estamos haciendo hoy):
    //      useClass: AuthMockService
    //
    //  Para integrar con la API de Angel (requiere tenerla levantada
    //  en http://localhost:5231):
    //      useClass: AuthHttpService
    //      ...y agregar el import de arriba.
    //
    //  Ningún componente cambia. Solo esta línea.
    // ─────────────────────────────────────────────────────────────────────
    { provide: AuthService, useClass: AuthMockService },
  ],
};
