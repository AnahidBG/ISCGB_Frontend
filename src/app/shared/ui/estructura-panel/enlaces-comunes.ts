import { EnlacePanel } from './estructura-panel';

/**
 * Enlaces que van al final del menú de todos los paneles, sin importar el rol.
 *
 * Justificar Inasistencia está acá porque los cuatro roles cargan
 * justificativos. Los otros dos todavía apuntan a pantallas "Próximamente":
 * el backend no tiene el endpoint de mesas de examen ni el de cambio de
 * contraseña.
 */
export const ENLACES_COMUNES: EnlacePanel[] = [
  { etiqueta: 'Justificar Inasistencia', url: '/justificativos/cargar', icono: 'documento' },
  { etiqueta: 'Calendario de Exámenes', url: '/calendario', icono: 'calendario' },
  { etiqueta: 'Configuración', url: '/configuracion', icono: 'configuracion' },
];
