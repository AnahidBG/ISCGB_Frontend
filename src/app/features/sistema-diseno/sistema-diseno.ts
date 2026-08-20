import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Boton } from '../../shared/ui/boton/boton';
import { Encabezado } from '../../shared/ui/encabezado/encabezado';

interface MuestraColor {
  nombre: string;
  variable: string;
  hex: string;
  nota?: string;
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
 * Es una herramienta interna: no es parte del MVP ni de ningún sprint.
 */
@Component({
  selector: 'app-sistema-diseno',
  imports: [Boton, Encabezado],
  templateUrl: './sistema-diseno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SistemaDiseno {
  protected readonly oficiales: MuestraColor[] = [
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
    },
  ];

  protected readonly derivados: MuestraColor[] = [
    { nombre: 'Principal oscuro', variable: 'principal-oscuro', hex: '#35504A', nota: 'Hover' },
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
    {
      nombre: 'Texto suave',
      variable: 'texto-suave',
      hex: '#666E6B',
      nota: 'Reemplaza al gris de marca en texto — 4.81:1 ✅',
    },
    { nombre: 'Texto', variable: 'texto', hex: '#2D2D2D' },
    { nombre: 'Borde', variable: 'borde', hex: '#E2E8E4' },
  ];

  protected readonly estados: MuestraColor[] = [
    { nombre: 'Aprobado', variable: 'aprobado', hex: '#2F8F5B' },
    { nombre: 'Pendiente', variable: 'pendiente', hex: '#B07D0A' },
    { nombre: 'Rechazado', variable: 'rechazado', hex: '#C0392B' },
  ];
}
