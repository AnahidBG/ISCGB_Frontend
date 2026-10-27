import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TemaService } from '../../core/tema/tema.service';
import { Boton } from '../../shared/ui/boton/boton';
import { Encabezado } from '../../shared/ui/encabezado/encabezado';
import { SelectorTema } from '../../shared/ui/selector-tema/selector-tema';

interface MuestraColor {
  nombre: string;
  variable: string;
  /** El valor en el tema claro, o el único si el color no cambia con el tema. */
  hex: string;
  /** El valor en el tema oscuro. Solo lo tienen los colores que cambian. */
  hexOscuro?: string;
  nota?: string;
  /** La nota es una advertencia (se dibuja en rojo). */
  alerta?: boolean;
}

interface GrupoColores {
  titulo: string;
  descripcion?: string;
  colores: MuestraColor[];
}

/**
 * Muestrario del sistema de diseño.
 *
 * Es una página viva: dibuja los componentes reales con los tokens reales.
 * Si alguien cambia un color en `styles.scss`, esta página cambia sola.
 *
 * Sirve para tres cosas:
 *   1. Verificar que el código coincide con Figma.
 *   2. Que backend y QA vean qué piezas existen sin abrir Figma.
 *   3. Encontrar componentes ya hechos antes de reinventarlos.
 *
 * Los textos hexadecimales de las muestras son copia de `styles.scss` (acá
 * hace falta mostrarlos, y un componente no puede leer un token como texto).
 * Los dos valores de un color que cambia con el tema están en el bloque
 * `data-tema='oscuro'` de ese archivo: si cambian allá, se corrigen acá.
 *
 * Es una herramienta interna: no es parte del MVP ni de ningún sprint.
 */
@Component({
  selector: 'app-sistema-diseno',
  imports: [Boton, Encabezado, SelectorTema],
  templateUrl: './sistema-diseno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SistemaDiseno {
  private readonly tema = inject(TemaService);

  /**
   * Con el tema oscuro puesto, cada muestra enseña el color oscuro. Leer la
   * señal acá adentro hace que la plantilla se redibuje cuando cambia el tema.
   */
  protected valor(color: MuestraColor): string {
    return this.tema.esOscuro() && color.hexOscuro ? color.hexOscuro : color.hex;
  }

  protected readonly grupos: GrupoColores[] = [
    {
      titulo: 'Oficiales del manual de identidad',
      descripcion: 'Son los colores de la marca: no cambian con el tema.',
      colores: [
        { nombre: 'Color principal', variable: 'principal', hex: '#46695F' },
        { nombre: 'Verde claro', variable: 'acento-verde', hex: '#90C997' },
        { nombre: 'Amarillo verdoso', variable: 'acento-lima', hex: '#CFD18D' },
        { nombre: 'Verde menta', variable: 'menta', hex: '#CBFFD1' },
        { nombre: 'Blanco humo', variable: 'humo', hex: '#F5F5F5' },
        {
          nombre: 'Gris verdoso',
          variable: 'gris-marca',
          hex: '#919D99',
          nota: 'Solo decorativo — 2.80:1, no alcanza para texto',
          alerta: true,
        },
      ],
    },
    {
      titulo: 'Derivados — no están en el manual',
      descripcion: 'Tampoco cambian con el tema.',
      colores: [
        {
          nombre: 'Principal oscuro',
          variable: 'principal-oscuro',
          hex: '#35504A',
          nota: 'Final del degradé del login',
        },
        {
          nombre: 'Verde claro reposo',
          variable: 'acento-verde-claro',
          hex: '#B8DDB4',
          nota: 'Botón primario',
        },
        {
          nombre: 'Verde claro presionado',
          variable: 'acento-verde-press',
          hex: '#7AAB80',
          nota: 'Botón primario',
        },
      ],
    },
    {
      titulo: 'Superficies y texto — cambian con el tema',
      descripcion:
        'Cada muestra enseña el color del tema que está puesto; debajo van los dos valores.',
      colores: [
        { nombre: 'Fondo', variable: 'fondo', hex: '#F5F5F5', hexOscuro: '#121614' },
        {
          nombre: 'Fondo de panel',
          variable: 'fondo-panel',
          hex: '#FAF9F5',
          hexOscuro: '#121614',
          nota: 'El de las pantallas internas',
        },
        {
          nombre: 'Superficie',
          variable: 'superficie',
          hex: '#FFFFFF',
          hexOscuro: '#1A201E',
          nota: 'Tarjetas, menús y diálogos',
        },
        {
          nombre: 'Humo',
          variable: 'humo',
          hex: '#F5F5F5',
          hexOscuro: '#232B28',
          nota: 'Lo elevado o apagado, dentro de una tarjeta',
        },
        {
          nombre: 'Borde',
          variable: 'borde',
          hex: '#E2E8E4',
          hexOscuro: '#2E3935',
          nota: 'Decorativo: separa, no se lee',
        },
        { nombre: 'Texto', variable: 'texto', hex: '#2D2D2D', hexOscuro: '#E6ECE9' },
        {
          nombre: 'Texto suave',
          variable: 'texto-suave',
          hex: '#666E6B',
          hexOscuro: '#A2AFAA',
          nota: 'Reemplaza al gris de marca en texto — 4.81:1 en claro y 6.39:1 en oscuro ✅',
        },
        {
          nombre: 'Pista de una barra',
          variable: 'pista',
          hex: '#CCD3D1',
          hexOscuro: '#3A4642',
          nota: 'La parte vacía de una barra de avance',
        },
        {
          nombre: 'Botón deshabilitado',
          variable: 'inactivo',
          hex: '#919D99',
          hexOscuro: '#3A4642',
          nota: 'El relleno de un botón verde apagado: en oscuro se oscurece para que se note que no anda',
        },
        {
          nombre: 'Velo',
          variable: 'velo',
          hex: '#2D2D2D',
          hexOscuro: '#000000',
          nota: 'Tapa la pantalla detrás de un diálogo, al 50 %',
        },
      ],
    },
    {
      titulo: 'Verdes y señales — cambian con el tema',
      descripcion:
        'El verde que se dibuja sobre la superficie (enlaces, foco, texto de lo elegido) se aclara en el tema oscuro.',
      colores: [
        {
          nombre: 'Principal sobre la superficie',
          variable: 'principal',
          hex: '#46695F',
          hexOscuro: '#90C997',
          nota: 'Enlaces, bordes, foco. El relleno de un botón es otro: ver "fijos"',
        },
        {
          nombre: 'Principal suave',
          variable: 'principal-suave',
          hex: '#EAF0EE',
          hexOscuro: '#223530',
          nota: 'Fondo tenue',
        },
        {
          nombre: 'Principal con énfasis',
          variable: 'principal-enfasis',
          hex: '#35504A',
          hexOscuro: '#B8DDB4',
          nota: 'Un enlace verde al pasar el mouse',
        },
        {
          nombre: 'Hover del relleno',
          variable: 'principal-solido-hover',
          hex: '#35504A',
          hexOscuro: '#4F7A6D',
          nota: 'Al pasar el mouse por un botón verde. En oscuro se aclara',
        },
        {
          nombre: 'Verde menta',
          variable: 'menta',
          hex: '#CBFFD1',
          hexOscuro: '#325E45',
          nota: 'Tinte de éxito',
        },
        {
          nombre: 'Aprobado como texto',
          variable: 'aprobado-texto',
          hex: '#1F6B43',
          hexOscuro: '#6CD39B',
          nota: 'El verde de "cumplido", legible como texto',
        },
        { nombre: 'Información', variable: 'info', hex: '#4A6FA5', hexOscuro: '#7FA6DB' },
      ],
    },
    {
      titulo: 'Rellenos fijos — no cambian con el tema',
      descripcion:
        'Llevan texto encima y tienen que seguir igual para sostenerlo: blanco sobre los tres primeros, tinta sobre el verde claro.',
      colores: [
        {
          nombre: 'Relleno principal',
          variable: 'principal-solido',
          hex: '#46695F',
          nota: 'Botones y la marca, con texto blanco',
        },
        {
          nombre: 'Relleno aprobado',
          variable: 'aprobado-solido',
          hex: '#2F8F5B',
          nota: 'Botón "Aprobar", con texto blanco',
        },
        {
          nombre: 'Relleno rechazado',
          variable: 'rechazado-solido',
          hex: '#C0392B',
          nota: 'Botón "Rechazar", con texto blanco',
        },
        {
          nombre: 'Texto sobre verde claro',
          variable: 'texto-sobre-claro',
          hex: '#2D2D2D',
          nota: 'Para los botones verde claro',
        },
      ],
    },
  ];

  /** Los tres estados de un documento. Como texto o ícono se aclaran en el tema oscuro. */
  protected readonly estados: MuestraColor[] = [
    { nombre: 'Aprobado', variable: 'aprobado', hex: '#2F8F5B', hexOscuro: '#4FBF84' },
    { nombre: 'Pendiente', variable: 'pendiente', hex: '#B07D0A', hexOscuro: '#E2B04A' },
    { nombre: 'Rechazado', variable: 'rechazado', hex: '#C0392B', hexOscuro: '#F2877E' },
  ];
}
