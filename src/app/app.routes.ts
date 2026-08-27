import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ROLES } from './core/auth/modelos/rol';
import { roleGuard } from './core/auth/role.guard';
import { ControlLegajosComponent } from './pages/control-legajos/control-legajos';
import { RevisionAdministrativaComponent } from './pages/revision-administrativa/revision-administrativa';

/**
 * Rutas de la aplicación.
 *
 * Cada pantalla se carga con `loadComponent`: su código no se descarga hasta
 * que alguien entra a esa ruta. Así el arranque es liviano aunque el sistema
 * crezca a los cuatro dashboards.
 *
 * Los guards van en orden y Angular corta en el primero que no pasa:
 *
 *   authGuard   → ¿hay sesión?
 *   roleGuard   → ¿esa sesión puede ver ESTA pantalla?
 */
export const routes: Routes = [
  { path: 'control-legajos', component: ControlLegajosComponent },
  { path: 'revision-administrativa', component: RevisionAdministrativaComponent },
  { path: '', redirectTo: 'control-legajos', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Iniciar sesión · ISCGB',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // Destino después de iniciar sesión. Protegida: sin sesión, `authGuard`
    // devuelve a /login antes de que la pantalla llegue a dibujarse.
    path: 'inicio',
    title: 'Inicio · ISCGB',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
  },
  {
    // Entrega del programa de materia. Solo Docente: es el único que dicta
    // una materia y por lo tanto el único que entrega su programa.
    path: 'docente/entrega-programa',
    title: 'Entregar programa de materia · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.docente)],
    loadComponent: () =>
      import('./features/docente/entrega-programa/entrega-programa').then(
        (m) => m.EntregaPrograma,
      ),
  },
  {
    // Herramienta interna: el muestrario de componentes y tokens.
    path: 'sistema-diseno',
    title: 'Sistema de diseño · ISCGB',
    loadComponent: () =>
      import('./features/sistema-diseno/sistema-diseno').then((m) => m.SistemaDiseno),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  }
];