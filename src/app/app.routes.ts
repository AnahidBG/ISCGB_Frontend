import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
<<<<<<< HEAD
import { ControlLegajosComponent } from './pages/control-legajos/control-legajos';
import { RevisionAdministrativaComponent } from './pages/revision-administrativa/revision-administrativa';
=======
import { ROLES } from './core/auth/modelos/rol';
import { roleGuard } from './core/auth/role.guard';
>>>>>>> origin/main

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
  {path: 'revision-administrativa', component: RevisionAdministrativaComponent},
  { path: '', redirectTo: 'control-legajos', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Iniciar sesión · ISCGB',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // Destino después de iniciar sesión. Protegida: sin sesión, `authGuard`
    // devuelve a /login antes de que la pantalla llegue a dibujarse.
    //
    // Sin `roleGuard` a propósito: es la pantalla común a todos los roles, y
    // además es a donde `roleGuard` manda a quien no puede entrar a otra.
    // Protegerla por rol dejaría a alguien rebotando en un círculo.
    path: 'inicio',
    title: 'Inicio · ISCGB',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
  },
  {
    // Entrega del programa de materia. Solo Docente: es el único que dicta
    // una materia y por lo tanto el único que entrega su programa.
    //
    // Un director que además da clase tiene los dos roles cargados en
    // `Usuarios_roles`, así que entra igual — alcanza con tener UNO de los
    // roles permitidos.
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
