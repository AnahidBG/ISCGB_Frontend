import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Boton } from '../boton/boton';

/** Un enlace de la navegación principal. */
export interface EnlaceNavegacion {
  etiqueta: string;
  url: string;
  /** `true` si es la sección donde está parado el usuario. */
  activo?: boolean;
}

/** Enlaces del sitio institucional (icgb.com.ar). */
export const NAVEGACION_INSTITUCIONAL: EnlaceNavegacion[] = [
  { etiqueta: 'Inicio', url: 'https://icgb.com.ar/', activo: true },
  { etiqueta: 'Carrera', url: 'https://icgb.com.ar/#carrera' },
  { etiqueta: 'Sobre nosotros', url: 'https://icgb.com.ar/#sobre-nosotros' },
  { etiqueta: 'Contacto', url: 'https://icgb.com.ar/#contacto' },
];

/**
 * Encabezado institucional con navegación principal.
 *
 * En escritorio los enlaces se muestran en una fila. En celular se guardan
 * detrás del botón de menú, porque cuatro enlaces más el logo no entran en
 * 392px sin apretujarse.
 *
 * El acceso al Portal de Autogestión va aparte, después de los enlaces de
 * navegación. Se dibuja como botón y no como enlace de texto a propósito:
 * los otros cuatro llevan a secciones del mismo sitio, este lleva a entrar
 * a un sistema. Son cosas distintas y conviene que se vean distintas.
 */
@Component({
  selector: 'app-encabezado',
  imports: [Boton],
  templateUrl: './encabezado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Encabezado {
  readonly enlaces = input<EnlaceNavegacion[]>(NAVEGACION_INSTITUCIONAL);

  /** A dónde lleva el botón del portal. */
  readonly urlAutogestion = input<string>('/login');

  /** ¿El menú de celular está abierto? */
  protected readonly menuAbierto = signal(false);

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
