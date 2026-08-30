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
    // Alta de usuarios — el reemplazo de crearlos desde Swagger.
    // Solo Director: ISCGB-PROJECT.md le da a ese rol el alta/baja de
    // usuarios y roles (Sprint 2).
    //
    // ⚠️ El backend no tiene todavía el endpoint que esto necesita
    // (`POST /api/Usuarios`). La pantalla está completa y lo avisa cuando el
    // servidor responde 404 — ver docs/contrato-alta-usuario.md.
    path: 'director/usuarios/nuevo',
    title: 'Nuevo usuario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.director)],
    loadComponent: () =>
      import('./features/director/alta-usuario/alta-usuario').then((m) => m.AltaUsuario),
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
    // Legajos de todo el instituto agrupados por persona, para aprobar o
    // rechazar. Secretario y Director (Sprint 2).
    path: 'secretario/control-legajos',
    title: 'Control de Legajos · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario, ROLES.director)],
    loadComponent: () =>
      import('./features/secretario/control-legajos/control-legajos').then(
        (m) => m.ControlLegajos,
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
    // El legajo propio completo, con filtros y los que faltan. Docente y
    // Alumno, igual que subir-documento.
    path: 'legajo/mis-documentos',
    title: 'Mis documentos · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.docente, ROLES.alumno)],
    loadComponent: () =>
      import('./features/legajo/mis-documentos/mis-documentos').then((m) => m.MisDocumentos),
  },
  {
    // Sin roleGuard a propósito: los cuatro roles cargan justificativos, así
    // que filtrar por rol sería escribir "cualquiera con sesión" al pedo.
    path: 'justificativos/cargar',
    title: 'Justificar inasistencia · ISCGB',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/justificativos/carga-justificativo/carga-justificativo').then(
        (m) => m.CargaJustificativo,
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
    // "Próximamente": calendario de mesas de examen (Sprint 3 del roadmap,
    // ver docs/ISCGB-PROJECT.md). Sin roleGuard porque los cuatro roles lo
    // van a usar — Docente y Director/Secretario para las mesas, Alumno para
    // consultarlas. Ver features/proximamente/proximamente.ts.
    path: 'calendario',
    title: 'Calendario de Exámenes · ISCGB',
    canActivate: [authGuard],
    data: {
      titulo: 'Calendario de Exámenes',
      descripcion:
        'Acá vas a poder ver las mesas de examen parciales y finales, para que a nadie se le superpongan fechas.',
      disponibleDesde: 'Sprint 3 · octubre de 2026',
      icono: 'calendario',
    },
    loadComponent: () =>
      import('./features/proximamente/proximamente').then((m) => m.Proximamente),
  },
  {
    // "Próximamente": cambio de contraseña y preferencias de cuenta
    // (Sprint 3 del roadmap). Mismo criterio que 'calendario' de arriba.
    path: 'configuracion',
    title: 'Configuración · ISCGB',
    canActivate: [authGuard],
    data: {
      titulo: 'Configuración',
      descripcion: 'Cambio de contraseña y preferencias de tu cuenta en el sistema.',
      disponibleDesde: 'Sprint 3 · octubre de 2026',
      icono: 'configuracion',
    },
    loadComponent: () =>
      import('./features/proximamente/proximamente').then((m) => m.Proximamente),
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
