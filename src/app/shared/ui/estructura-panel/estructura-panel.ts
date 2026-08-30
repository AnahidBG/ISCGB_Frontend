import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { inicialesDe } from '../../../core/comun/texto';
import { Icono, NombreIcono } from '../icono/icono';

/** Un enlace del menú lateral de un panel. */
export interface EnlacePanel {
  etiqueta: string;
  url: string;
  /** Ícono a la izquierda. Sin esto el enlace queda solo con texto. */
  icono?: NombreIcono;
}

/** La acción principal del panel: el botón verde arriba a la derecha. */
export interface AccionPanel {
  etiqueta: string;
  url: string;
  icono?: NombreIcono;
}

/** Dónde se guarda si la persona prefiere el menú colapsado. Ver `leerPreferenciaColapso`. */
const CLAVE_COLAPSADO = 'iscgb.panel.colapsado';

/**
 * Estructura común a los paneles de cada rol: barra lateral + encabezado
 * superior, con el contenido de la pantalla proyectado por `<ng-content>`.
 *
 * Sigue la plantilla de Figma: marca arriba a la izquierda, menú con íconos,
 * cerrar sesión abajo separado del resto; y arriba buscador, campana de
 * notificaciones y el bloque de la persona, que al tocarlo abre su menú.
 *
 * No sabe nada de autenticación ni de datos: recibe todo por `input()` y
 * avisa por `output()`. Así sirve para Director, Secretario, Docente y Alumno
 * por igual.
 *
 * ── Colapsar / expandir (agregado 27/08/2026) ─────────────────────────────
 * En escritorio la barra se puede achicar a una franja de solo íconos con el
 * botón de flecha de la marca — más ancho para las tablas y listas de cada
 * panel. La preferencia se guarda en `localStorage` (del NAVEGADOR, no de la
 * cuenta: cerrar sesión no la borra) para no repetir el gesto en cada visita.
 * En celular esta noción no existe: el menú sigue siendo un cajón que se abre
 * y se cierra entero — colapsarlo A MEDIAS en una pantalla chica no tendría
 * sentido, y por eso el botón de colapsar está oculto ahí (`hidden lg:flex`
 * en el HTML).
 */
@Component({
  selector: 'app-estructura-panel',
  imports: [RouterLink, RouterLinkActive, Icono],
  templateUrl: './estructura-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Un clic en cualquier lado cierra el menú de la persona, y Escape
    // también. Es lo que cualquiera espera de un menú desplegable: si no,
    // queda abierto tapando cosas hasta que se vuelve a tocar el avatar.
    '(document:click)': 'cerrarMenuPerfil()',
    '(document:keydown.escape)': 'cerrarMenuPerfil()',
  },
})
export class EstructuraPanel {
  readonly enlaces = input.required<EnlacePanel[]>();

  /**
   * El título grande de la pantalla.
   *
   * Con `encabezado = 'saludo'` (el default) no se usa: el h1 saluda por el
   * nombre, como en el dashboard del Figma. Con `encabezado = 'titulo'` se
   * muestra este texto — es lo que corresponde en pantallas que hacen una
   * cosa concreta ("Subir Documento"), donde saludar sería raro.
   */
  readonly tituloPagina = input<string>('');

  /** La línea gris debajo del título. */
  readonly subtitulo = input<string>('');

  /**
   * Con esta ruta, aparece un "‹ Volver" arriba del título.
   *
   * Sin esto no se dibuja nada — la mayoría de las pantallas SON el destino
   * (los cuatro dashboards), no hay "atrás" al que volver desde ahí. Tiene
   * sentido en pantallas que hacen una cosa puntual y dependen de dónde
   * viniste: "Subir Documento" vuelve al panel de quien lo abrió, y las
   * pantallas "Próximamente" (Calendario, Configuración) también.
   */
  readonly volverUrl = input<string | null>(null);

  readonly encabezado = input<'saludo' | 'titulo'>('saludo');

  readonly nombreUsuario = input<string>('');
  readonly rolPrincipal = input<string>('');
  readonly emailUsuario = input<string>('');

  /** El botón verde de arriba a la derecha. Sin esto no se dibuja ninguno. */
  readonly accionPrincipal = input<AccionPanel | null>(null);

  /**
   * Cuántas cosas requieren atención de esta persona.
   *
   * Más de cero enciende el puntito rojo sobre la campana.
   *
   * Es un número y no un booleano a propósito: obliga a quien use el panel a
   * decir CUÁNTAS cosas hay, y eso obliga a que salgan de algo real. Un
   * puntito rojo permanente que no corresponde a nada es peor que no tener
   * campana: la gente aprende a ignorarlo, y el día que sí importe tampoco lo
   * van a mirar.
   */
  readonly notificaciones = input<number>(0);

  readonly cerrarSesion = output<void>();

  /** `true` con el menú de celular abierto. En escritorio siempre está visible. */
  protected readonly menuAbierto = signal(false);

  /** `true` con el menú de la persona (el que sale de la foto) desplegado. */
  protected readonly menuPerfilAbierto = signal(false);

  /** `true` con la barra lateral reducida a solo íconos. Ver el comentario de arriba. */
  protected readonly colapsado = signal(leerPreferenciaColapso());

  protected readonly hayNotificaciones = computed(() => this.notificaciones() > 0);

  protected readonly mostrarSaludo = computed(
    () => this.encabezado() === 'saludo' && this.primerNombre() !== '',
  );

  /**
   * Texto de la campana para lectores de pantalla.
   *
   * El puntito rojo es información visual: sin esto, quien no ve la pantalla
   * no se entera de que hay algo pendiente.
   */
  protected readonly etiquetaNotificaciones = computed(() => {
    const cantidad = this.notificaciones();
    if (cantidad === 0) {
      return 'Notificaciones. No hay novedades.';
    }
    return `Notificaciones. ${cantidad} ${cantidad === 1 ? 'novedad' : 'novedades'}.`;
  });

  /**
   * Las iniciales, para el círculo mientras no haya foto.
   *
   * ⚠️ El backend todavía no guarda foto de perfil: el modelo `Usuario` no
   * tiene ningún campo de imagen. Hasta que exista, el círculo muestra las
   * iniciales, que es mejor que un ícono genérico de persona: identifica de
   * un vistazo a quién pertenece la sesión.
   */
  protected readonly iniciales = computed(() => inicialesDe(this.nombreUsuario()));

  /** Solo el nombre de pila, que es como saluda el encabezado del Figma. */
  protected readonly primerNombre = computed(
    () => this.nombreUsuario().trim().split(/\s+/)[0] ?? '',
  );

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  /**
   * `stopPropagation` para que este mismo clic no llegue al `document` y
   * cierre el menú que se acaba de abrir.
   */
  protected alternarMenuPerfil(evento: Event): void {
    evento.stopPropagation();
    this.menuPerfilAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuPerfil(): void {
    this.menuPerfilAbierto.set(false);
  }

  protected alternarColapso(): void {
    this.colapsado.update((valor) => {
      const nuevo = !valor;
      guardarPreferenciaColapso(nuevo);
      return nuevo;
    });
  }
}

/**
 * Lee la preferencia guardada. Si `localStorage` no está disponible (modo
 * privado estricto de Safari, por ejemplo) o no hay nada guardado todavía,
 * arranca expandida — es el comportamiento de siempre, así que nadie nota la
 * diferencia la primera vez que entra.
 */
function leerPreferenciaColapso(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADO) === '1';
  } catch {
    return false;
  }
}

/** Si falla el guardado, la preferencia simplemente no persiste — no es un error fatal. */
function guardarPreferenciaColapso(colapsado: boolean): void {
  try {
    localStorage.setItem(CLAVE_COLAPSADO, colapsado ? '1' : '0');
  } catch {
    // Ídem `leerPreferenciaColapso`: modo privado u otra restricción del navegador.
  }
}
