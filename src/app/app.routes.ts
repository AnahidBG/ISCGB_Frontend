import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ROLES } from './core/auth/modelos/rol';
import { roleGuard } from './core/auth/role.guard';
import { confirmarSalidaGuard } from './core/comun/confirmar-salida.guard';

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
    // El formulario consume POST /api/Auth/login; el endpoint fue verificado
    // en el backend actualizado (commit c048908, PR #25).
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
    // Pantalla pública, sin `authGuard` ni `roleGuard`: la persona llega desde
    // el link del mail de alta SIN sesión, y todavía no tiene contraseña con
    // qué iniciarla. Se llama `crear-password` (y no `crear-contrasena` como
    // `recuperar-contrasena`) porque el link que arma el backend ya es el
    // contrato: `/crear-password?token=...`. Ver features/crear-password/.
    path: 'crear-password',
    title: 'Crear contraseña · ISCGB',
    loadComponent: () =>
      import('./features/crear-password/crear-password').then((m) => m.CrearPassword),
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
    // Alta de usuarios — Sprint 2, "Gestión de usuarios y roles" (SCRUM-16).
    // Solo Director: ISCGB-PROJECT.md le da a ese rol el alta/baja de
    // usuarios y roles. Pega contra `POST /api/UsuariosAdmin/alta` —
    // ver docs/contrato-alta-usuario.md.
    path: 'director/usuarios/nuevo',
    title: 'Nuevo usuario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.director)],
    loadComponent: () =>
      import('./features/director/alta-usuario/alta-usuario').then((m) => m.AltaUsuario),
  },
  {
    // Modificación y BAJA de usuarios — el complemento de "Nuevo Usuario".
    // `PUT /api/UsuariosAdmin/modificar/{id}` y `.../baja/{id}`.
    path: 'director/usuarios/:idUsuario/editar',
    title: 'Editar usuario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.director)],
    loadComponent: () =>
      import('./features/director/editar-usuario/editar-usuario').then((m) => m.EditarUsuario),
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
    // Listado operativo de alumnos y docentes para Secretaría, con búsqueda
    // local por nombre/DNI/correo y filtros por rol y estado.
    path: 'secretario/listados',
    title: 'Listado de personas · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario)],
    loadComponent: () =>
      import('./features/secretario/listados/listados-secretario').then(
        (m) => m.ListadosSecretario,
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
    // Bandeja de reconocimiento de saberes. Solo Secretario: el backend tiene
    // `[Authorize(Roles = "Secretario")]` (Dirección recibiría 403).
    path: 'secretario/reconocimiento-saberes',
    title: 'Solicitudes de reconocimiento · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario)],
    loadComponent: () =>
      import('./features/secretario/solicitudes-reconocimiento/solicitudes-reconocimiento').then(
        (m) => m.SolicitudesReconocimiento,
      ),
  },
  {
    // Cada cuántos días el sistema le recuerda por mail a cada persona la
    // documentación que le falta (SCRUM-151). Solo Secretario: es quien la
    // configura. `GET`/`PUT /api/Configuracion/frecuencia-notificaciones`.
    path: 'secretario/frecuencia-avisos',
    title: 'Frecuencia de avisos · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario)],
    loadComponent: () =>
      import('./features/secretario/frecuencia-avisos/frecuencia-avisos').then(
        (m) => m.FrecuenciaAvisos,
      ),
  },
  {
    // Alta de materias y asignación docente–materia–comisión
    // (`AsignacionesController`). Dirección y Secretaría.
    path: 'materias/asignaciones',
    title: 'Materias y asignaciones · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.director, ROLES.secretario)],
    loadComponent: () =>
      import('./features/materias/asignaciones/asignaciones').then((m) => m.Asignaciones),
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
    // El programa es largo: salir sin enviarlo pierde todo lo cargado.
    canDeactivate: [confirmarSalidaGuard],
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
    // El legajo de otra persona para revisión por parte de Secretaría o Dirección.
    path: 'legajo/usuario/:idUsuario',
    title: 'Legajo del usuario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.secretario, ROLES.director)],
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
    // Certificado de alumno regular — Sprint 2, "Solicitud de certificado de
    // alumno regular (Estudiante)" (SCRUM-12). Lo genera el backend
    // (`GET /api/Certificados/alumno-regular`), con sello y nombre del
    // instituto. Ver `certificado-regular.ts`.
    path: 'alumno/certificado/regular',
    title: 'Certificado de alumno regular · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.alumno)],
    data: { variante: 'regular' },
    loadComponent: () =>
      import('./features/alumno/certificado-regular/certificado-regular').then(
        (m) => m.CertificadoRegular,
      ),
  },
  {
    // La misma pantalla, variante CON horario de cursada
    // (`GET /api/Certificados/alumno-regular-horario`). Antes era
    // "Próximamente": el backend ya la genera, con las líneas de días y
    // horarios para que Preceptoría las complete.
    path: 'alumno/certificado/regular-con-horario',
    title: 'Certificado de alumno regular con horario · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.alumno)],
    data: { variante: 'regular-con-horario' },
    loadComponent: () =>
      import('./features/alumno/certificado-regular/certificado-regular').then(
        (m) => m.CertificadoRegular,
      ),
  },
  {
    // Solicitud de reconocimiento de saberes — Sprint 2 (SCRUM-30). El
    // endpoint todavía no existe en el backend: la pantalla lo avisa. Ver
    // docs/contrato-reconocimiento-saberes.md.
    path: 'alumno/reconocimiento-saberes',
    title: 'Reconocimiento de saberes · ISCGB',
    canActivate: [authGuard, roleGuard(ROLES.alumno)],
    loadComponent: () =>
      import('./features/alumno/reconocimiento-saberes/reconocimiento-saberes').then(
        (m) => m.ReconocimientoSaberes,
      ),
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
