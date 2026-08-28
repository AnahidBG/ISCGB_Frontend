import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ROLES } from './core/auth/modelos/rol';
import { roleGuard } from './core/auth/role.guard';

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
  {
    path: 'login',
    title: 'Iniciar sesión · ISCGB',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // Pantalla pública, sin `authGuard`: a esta se llega SIN sesión (es lo
    // que resuelve "¿Olvidaste tu contraseña?" en el login). Provisoria y
    // con datos falsos — ver docs/alcance-login.md y el comentario en el
    // propio componente.
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña · ISCGB',
    loadComponent: () =>
      import('./features/recuperar-contrasena/recuperar-contrasena').then(
        (m) => m.RecuperarContrasena,
      ),
  },
  {
    // Destino después de iniciar sesión para quien no tiene NINGÚN rol
    // asignado (existe: "Nadia Sinrol" en `usuarios-de-prueba.ts`) y el
    // destino de `roleGuard` cuando una sesión entra a una pantalla que no
    // es suya. Ya no es el destino común: los cuatro roles tienen panel
    // propio (ver `Login.destinoSegunRoles`).
    //
    // Sin `roleGuard` a propósito, igual que antes: protegerla por rol
    // dejaría a alguien sin ningún rol rebotando en un círculo.
    path: 'inicio',
    title: 'Inicio · ISCGB',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
  },
  {
    // Visualización global de usuarios del instituto. Datos de ejemplo —
    // ver docs/alcance-dashboard-director.md.
    path: 'director/panel',
    title: 'Panel del Director · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.director)],
    loadComponent: () =>
      import('./features/director/panel-director/panel-director').then((m) => m.PanelDirector),
  },
  {
    // Documentos pendientes de revisión de todo el instituto. Datos de
    // ejemplo — ver docs/alcance-paneles-roles.md.
    path: 'secretario/panel',
    title: 'Panel del Secretario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario)],
    loadComponent: () =>
      import('./features/secretario/panel-secretario/panel-secretario').then(
        (m) => m.PanelSecretario,
      ),
  },
  {
    // Legajo propio del Docente + progreso. Datos de ejemplo.
    path: 'docente/panel',
    title: 'Mi legajo · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.docente)],
    loadComponent: () =>
      import('./features/docente/panel-docente/panel-docente').then((m) => m.PanelDocente),
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
    // Subir un documento al legajo propio. La comparten Docente y Alumno:
    // los dos presentan documentación, cambia solo QUÉ documentos les pide
    // el instituto — y eso lo resuelve el propio backend según el rol
    // (GET /api/Legajos/requeridos-por-rol/{idRol}), no una pantalla por rol.
    //
    // Por eso vive en `features/legajo/` y no adentro de `features/docente/`:
    // un componente de un feature no se importa desde otro feature (CLAUDE.md).
    path: 'legajo/subir-documento',
    title: 'Subir documento · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.docente, ROLES.alumno)],
    loadComponent: () =>
      import('./features/legajo/subir-documento/subir-documento').then(
        (m) => m.SubirDocumento,
      ),
  },
  {
    // Legajo propio del Alumno + progreso. Datos de ejemplo.
    path: 'alumno/panel',
    title: 'Mi legajo · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.alumno)],
    loadComponent: () =>
      import('./features/alumno/panel-alumno/panel-alumno').then((m) => m.PanelAlumno),
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
    // 404. Antes esta ruta redirigía al login sin decir nada, y eso confunde:
    // quien se equivocó al tipear una dirección aparecía en el login sin
    // entender por qué, y si ya tenía sesión abierta encima parecía que lo
    // habían echado. Ahora hay una pantalla que lo explica y ofrece a dónde ir.
    //
    // Sin guards a propósito: una dirección que no existe no existe para
    // nadie, con sesión o sin ella.
    path: '**',
    title: 'Página no encontrada · ISCGB',
    loadComponent: () =>
      import('./features/no-encontrado/no-encontrado').then((m) => m.NoEncontrado),
  },
];
