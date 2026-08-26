import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ControlLegajosComponent } from './pages/control-legajos/control-legajos';
import { RevisionAdministrativaComponent } from './pages/revision-administrativa/revision-administrativa';

/**
 * Rutas de la aplicación.
 *
 * Cada pantalla se carga con `loadComponent`: su código no se descarga hasta
 * que alguien entra a esa ruta. Así el arranque es liviano aunque el sistema
 * crezca a los cuatro dashboards.
 */
export const routes: Routes = [
  { path: 'control-legajos', component: ControlLegajosComponent },
  {path: 'revision-administrativa', component: RevisionAdministrativaComponent},
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
    // Entrega del programa de materia (Docente). Sprint 1 del roadmap
    // (ver docs/ISCGB-PROJECT.md). Protegida igual que /inicio.
    path: 'docente/entrega-programa',
    title: 'Entregar programa de materia · ISCGB',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/docente/entrega-programa/entrega-programa').then(
        (m) => m.EntregaPrograma,
      ),
  },
  {
    // Herramienta interna: el muestrario de componentes y tokens.
    // No es parte del MVP; sirve para verificar que el código coincide
    // con Figma y para que el equipo vea qué piezas ya existen.
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
