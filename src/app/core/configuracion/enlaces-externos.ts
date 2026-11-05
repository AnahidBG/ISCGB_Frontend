/**
 * Los sitios de afuera a los que ISCGB lleva. Igual que las rutas de la API
 * (`api.ts`), se escriben en un solo lugar: si el instituto cambia una dirección,
 * se cambia acá.
 */

/** Quién entra a SIAADE. Cada perfil tiene su propia puerta de entrada. */
export type PerfilSiaade = 'alumno' | 'docente';

/**
 * SIAADE, el sistema académico del instituto (SCRUM-15). Es un sitio aparte, con
 * su propio usuario y contraseña: ISCGB solo lleva hasta la entrada. Alumnos y
 * docentes entran por direcciones distintas.
 */
export const ENLACE_SIAADE: Readonly<Record<PerfilSiaade, string>> = {
  alumno: 'https://www.gesteal.com.ar/si/adm/adinisi.php?A=1',
  docente: 'https://www.gesteal.com.ar/si/adm/adinisi.php',
};

/** El libro de temas de un año de la carrera. */
export interface LibroDeTemasDelAnio {
  /** Cómo se muestra: "Primer año". */
  anio: string;
  /** La carpeta de Google Drive del instituto. */
  enlace: string;
}

/**
 * Los libros de temas (SCRUM-232): una carpeta de Google Drive por año, que
 * arma el instituto. Son las del ciclo 2026 (`IS-CGB_LibroTemas_1ro_2026` y
 * `IS-CGB_LibroTemas_2do_2026`); cuando el instituto pase las del año
 * siguiente, o la de otro año, se cambian o se agregan acá.
 */
export const LIBROS_DE_TEMAS: readonly LibroDeTemasDelAnio[] = [
  {
    anio: 'Primer año',
    enlace: 'https://drive.google.com/drive/folders/1IyQPTeZAyP9aGeKV7dNMLSt06ZSXU0ld',
  },
  {
    anio: 'Segundo año',
    enlace: 'https://drive.google.com/drive/folders/1GREfOERRRrVKdJYtHXaf6t8obmqoGlyJ',
  },
];

/** Quién ve los recursos: cada perfil tiene los suyos. */
export type PerfilRecursos = 'alumno' | 'docente';

/** Qué clase de material es: define el ícono y el título de la sección. */
export type TipoRecurso = 'documentacion' | 'tutorial';

/**
 * Un material que el instituto pone a disposición. `enlace` es `null` cuando el
 * cliente todavía no entregó el material: la tarjeta se muestra igual, con
 * "No hay documentación cargada", para que el lugar esté reservado y no haya
 * que rediseñar la pantalla cuando llegue.
 */
export interface RecursoExterno {
  tipo: TipoRecurso;
  titulo: string;
  descripcion: string;
  /** La carpeta de Google Drive, o `null` si todavía no hay nada cargado. */
  enlace: string | null;
}

/**
 * Documentación para descargar y tutoriales que ven el alumno y el docente en su
 * Inicio (SCRUM-228, SCRUM-229, SCRUM-230 y SCRUM-231). Son carpetas de Google
 * Drive que arma el instituto: si agregan o cambian algo, se hace en Drive y no
 * hace falta tocar el código. Si cambia la carpeta, se cambia acá.
 *
 * - Alumno (SCRUM-228): formatos institucionales. Los tutoriales para estudiantes
 *   no tienen ticket ni material todavía.
 * - Docente: ARCA, BDO (Encode) y certificado de servicios (SCRUM-229);
 *   plantillas y normas IRAM/ISO (SCRUM-230, bloqueado: el cliente no envió el
 *   material); tutoriales de herramientas (SCRUM-231).
 */
export const RECURSOS_POR_PERFIL: Readonly<Record<PerfilRecursos, readonly RecursoExterno[]>> = {
  alumno: [
    {
      tipo: 'documentacion',
      titulo: 'Documentos y formatos estudiantiles',
      descripcion:
        'Convenio de Beca Fundación Encode, autorización de uso de imagen y voz, y los formatos de apto médico y apto psicológico.',
      enlace: 'https://drive.google.com/drive/folders/1MzsUMklYldefhAAJZWsIpBmd7hOBkpI0',
    },
    {
      tipo: 'tutorial',
      titulo: 'Tutoriales para estudiantes',
      descripcion: 'Guías para usar las herramientas del instituto.',
      enlace: null,
    },
  ],
  docente: [
    {
      tipo: 'documentacion',
      titulo: 'Documentación para descargar',
      descripcion: 'ARCA, BDO (Encode) y certificado de servicios.',
      enlace: 'https://drive.google.com/drive/folders/12Rctj9FbfqetCB26EW9CIIckQoqupKFS',
    },
    {
      tipo: 'documentacion',
      titulo: 'Plantillas y normas IRAM/ISO',
      descripcion: 'Modelos de plantillas con los formatos asignados por el instituto.',
      enlace: null,
    },
    {
      tipo: 'tutorial',
      titulo: 'Tutoriales de herramientas',
      descripcion: 'Asistencia para profesores: cómo usar las herramientas del instituto.',
      enlace: 'https://drive.google.com/drive/folders/1U6ys8Iwq-bw6rofCI1DOMwJ3bAbOnbS2',
    },
  ],
};
