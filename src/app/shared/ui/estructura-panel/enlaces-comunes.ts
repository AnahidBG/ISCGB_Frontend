import { EnlacePanel } from './estructura-panel';

/**
 * Enlaces que van al final del menú de todos los paneles, sin importar el rol.
 *
 * Justificar Inasistencia está acá porque los cuatro roles lo usan. El
 * calendario de parciales no: lo ven el Docente, el Secretario y el Director, y
 * cada uno llega por su camino (`enlacesPorSesion`). Configuración todavía
 * apunta a una pantalla "Próximamente": el backend no tiene el endpoint de cambio
 * de contraseña.
 */
export const ENLACES_COMUNES: EnlacePanel[] = [
  { etiqueta: 'Justificar Inasistencia', url: '/justificativos/cargar', icono: 'documento' },
  { etiqueta: 'Configuración', url: '/configuracion', icono: 'configuracion' },
];
