import { EnlacePanel } from './estructura-panel';

/**
 * Enlaces que van al final del menú de todos los paneles, sin importar el rol.
 *
 * Justificar Inasistencia y el calendario de exámenes están acá porque los
 * cuatro roles los usan. Configuración todavía apunta a una pantalla
 * "Próximamente": el backend no tiene el endpoint de cambio de contraseña.
 */
export const ENLACES_COMUNES: EnlacePanel[] = [
  { etiqueta: 'Justificar Inasistencia', url: '/justificativos/cargar', icono: 'documento' },
  { etiqueta: 'Calendario de Exámenes', url: '/calendario', icono: 'calendario' },
  { etiqueta: 'Configuración', url: '/configuracion', icono: 'configuracion' },
];
