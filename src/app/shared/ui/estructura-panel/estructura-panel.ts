import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { PARAMETRO_ACCESO_DENEGADO } from '../../../core/auth/role.guard';
import { inicialesDe } from '../../../core/comun/texto';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { FilaNotificacion } from '../fila-notificacion/fila-notificacion';
import { Icono, NombreIcono } from '../icono/icono';
import { PanelNotificaciones } from '../panel-notificaciones/panel-notificaciones';

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

/** Se re-exporta para quien ya la importaba de acá: vive en `core/notificaciones/`. */
export type { NotificacionPanel };

/** Dónde se guarda si la persona prefiere el menú colapsado. Ver `leerPreferenciaColapso`. */
const CLAVE_COLAPSADO = 'iscgb.panel.colapsado';

/**
 * Cuántas filas entran en el desplegable de la campana. El resto se ve en el
 * panel lateral ("Ver todas"). El recorte vive acá, en la presentación, y no
 * en `core/`: `CampanaService` entrega la lista completa.
 */
const MAXIMO_NOTIFICACIONES_EN_DESPLEGABLE = 5;

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
 *
 * ── Acceso denegado (Sprint 2) ────────────────────────────────────────────
 * Cuando `roleGuard` (o un 403 del backend) rebota a alguien de una pantalla
 * que no es de su rol, lo trae a SU panel con `?accesoDenegado=1`. El cartel
 * se dibuja acá y no en cada panel porque los cuatro paneles usan esta misma
 * estructura: así ninguno se olvida de mostrarlo. Leer un query param es
 * navegación, no autenticación — el componente sigue sin saber nada de
 * sesiones.
 */
@Component({
  selector: 'app-estructura-panel',
  imports: [RouterLink, RouterLinkActive, Icono, FilaNotificacion, PanelNotificaciones],
  templateUrl: './estructura-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Un clic en cualquier lado cierra SOLO el menú de la persona: es lo que
    // cualquiera espera de un menú desplegable corto.
    //
    // El panel de notificaciones NO se cierra con un clic afuera: se lee de a
    // poco y tocar la pantalla de al lado por error lo hacía desaparecer. Se
    // cierra con la X, con Escape, volviendo a tocar la campana, tocando un
    // aviso (que navega) o abriendo el menú de la persona.
    //
    // El panel lateral de "Ver todas" sigue el mismo criterio: X, Escape o un
    // aviso con enlace; el fondo oscuro NO lo cierra.
    //
    // Escape cierra ESOS dos y además el cajón de celular — un diálogo modal
    // (`role="dialog" aria-modal="true"`) tiene que poder cerrarse con Escape
    // (ARIA APG). El clic afuera NO cierra el cajón: para eso está su fondo
    // oscuro, que ya lo maneja. Meter el cajón en `cerrarMenusFlotantes()`
    // haría que el mismo clic que abre la hamburguesa lo cierre al burbujear
    // hasta el `document` — por eso Escape va por un método aparte.
    '(document:click)': 'cerrarMenuPerfil()',
    '(document:keydown.escape)': 'cerrarConEscape()',
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
   *
   * Los dos inputs de la campana (este y `notificacionesDetalle`) los llena el
   * CONTENEDOR de cada pantalla con lo que dice `CampanaService`, que es lo
   * mismo en todas porque depende de la sesión y no de la pantalla. Este
   * componente no inyecta el servicio: sigue siendo presentacional.
   */
  readonly notificaciones = input<number>(0);

  /**
   * Qué son esas novedades, una por una: lo que se despliega al tocar la
   * campana.
   *
   * Es opcional. Sin esto la campana sigue funcionando: se abre igual y dice
   * cuántas cosas hay, solo que sin el detalle. Así ninguna pantalla queda con
   * un botón que no hace nada si todavía no tiene la lista.
   *
   * Trae la lista COMPLETA, una fila por aviso (puede ser MENOS filas que
   * `notificaciones()`: una fila de Secretaría agrupa todos los documentos de
   * una persona). El desplegable muestra solo las primeras y avisa cuántas
   * FILAS quedan afuera (ver `notificacionesNoListadas`); el panel lateral
   * ("Ver todas") las muestra todas.
   */
  readonly notificacionesDetalle = input<NotificacionPanel[]>([]);

  readonly cerrarSesion = output<void>();

  private readonly ruta = inject(ActivatedRoute);

  private readonly llegoConAccesoDenegado = toSignal(
    this.ruta.queryParamMap.pipe(map((params) => params.get(PARAMETRO_ACCESO_DENEGADO) === '1')),
    { initialValue: false },
  );

  /** Se puede cerrar con la cruz; vuelve a aparecer si hay otro rebote. */
  private readonly avisoAccesoCerrado = signal(false);

  protected readonly mostrarAccesoDenegado = computed(
    () => this.llegoConAccesoDenegado() && !this.avisoAccesoCerrado(),
  );

  protected cerrarAvisoAcceso(): void {
    this.avisoAccesoCerrado.set(true);
  }

  /** `true` con el menú de celular abierto. En escritorio siempre está visible. */
  protected readonly menuAbierto = signal(false);

  /** `true` con el menú de la persona (el que sale de la foto) desplegado. */
  protected readonly menuPerfilAbierto = signal(false);

  /** `true` con la barra lateral reducida a solo íconos. Ver el comentario de arriba. */
  protected readonly colapsado = signal(leerPreferenciaColapso());

  /** `true` con el panelcito de la campana desplegado. */
  protected readonly menuNotificacionesAbierto = signal(false);

  /** `true` con el panel lateral de TODAS las notificaciones abierto. */
  protected readonly panelNotificacionesAbierto = signal(false);

  /** La campana: a ella vuelve el foco al cerrar el panel lateral. */
  private readonly botonCampana = viewChild<ElementRef<HTMLButtonElement>>('botonCampana');

  /**
   * Cuántas novedades hay: el número que manda el panel o, si no mandó
   * ninguno pero sí la lista, cuántos ítems tiene esa lista. Así un panel
   * puede pasar solo `notificacionesDetalle` y la campana igual se enciende.
   */
  protected readonly cantidadNotificaciones = computed(() =>
    this.notificaciones() > 0 ? this.notificaciones() : this.notificacionesDetalle().length,
  );

  protected readonly hayNotificaciones = computed(() => this.cantidadNotificaciones() > 0);

  /** Las filas que entran en el desplegable: las primeras, sin tocar la lista original. */
  protected readonly notificacionesDelDesplegable = computed(() =>
    this.notificacionesDetalle().slice(0, MAXIMO_NOTIFICACIONES_EN_DESPLEGABLE),
  );

  /**
   * Cuántas FILAS quedaron afuera del desplegable. Cuenta filas y no la
   * diferencia con la insignia: para Secretaría la insignia cuenta documentos
   * y una fila agrupa los de una persona, así que esa resta podía decir
   * "Y 2 novedades más" sin ninguna fila oculta.
   */
  protected readonly notificacionesNoListadas = computed(
    () => this.notificacionesDetalle().length - this.notificacionesDelDesplegable().length,
  );

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
    const cantidad = this.cantidadNotificaciones();
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
  protected readonly iniciales = computed(() => inicialesDe(this.nombreUsuario()) || '?');

  /** Solo el nombre de pila, que es como saluda el encabezado del Figma. */
  protected readonly primerNombre = computed(
    () => this.nombreUsuario().trim().split(/\s+/)[0] ?? '',
  );

  /**
   * Etiqueta accesible del botón de la persona, con reserva por si
   * `nombreCompleto` llega vacío (usuario sin nombre/apellido cargados en
   * la base — pasa de verdad, ver `Usuarios.nombre`/`apellido` anulables).
   *
   * ⚠️ Bug real encontrado el 25/09/2026: antes todo el bloque de la
   * persona (el botón, el círculo con las iniciales, el menú desplegable)
   * vivía detrás de `@if (nombreUsuario())` en el HTML. Angular trata la
   * cadena vacía como falsy, así que con `nombreCompleto: ''` el botón NO
   * SE DIBUJABA — ni una versión rota, directamente no existía en el DOM.
   * Para quien usa el sistema eso se ve exactamente igual que "toco el
   * ícono de la persona y no pasa nada": no hay nada ahí para tocar. Ahora
   * el bloque se dibuja siempre; lo único que cambia con el nombre vacío es
   * esta etiqueta y las iniciales (ver `iniciales` arriba).
   */
  protected readonly etiquetaMenuPersona = computed(
    () => `Menú de ${this.nombreUsuario().trim() || 'la cuenta'}`,
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
   *
   * Abrir uno cierra el otro: los dos desplegables salen de la misma esquina
   * y superpuestos taparían medio encabezado.
   */
  protected alternarMenuPerfil(evento: Event): void {
    evento.stopPropagation();
    this.menuNotificacionesAbierto.set(false);
    this.menuPerfilAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuPerfil(): void {
    this.menuPerfilAbierto.set(false);
  }

  /** Ídem `alternarMenuPerfil`, del otro lado. */
  protected alternarMenuNotificaciones(evento: Event): void {
    evento.stopPropagation();
    this.menuPerfilAbierto.set(false);
    this.menuNotificacionesAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuNotificaciones(): void {
    this.menuNotificacionesAbierto.set(false);
  }

  /** "Ver todas": el desplegable cede el lugar al panel lateral. */
  protected abrirPanelNotificaciones(): void {
    this.menuNotificacionesAbierto.set(false);
    this.panelNotificacionesAbierto.set(true);
  }

  /** Cierra el panel lateral y devuelve el foco a la campana que lo abrió. */
  protected cerrarPanelNotificaciones(): void {
    this.panelNotificacionesAbierto.set(false);
    this.botonCampana()?.nativeElement.focus();
  }

  /**
   * Cierra los dos desplegables del encabezado. Lo usa Escape; el clic afuera
   * cierra solo el de la persona (ver el `host`).
   */
  protected cerrarMenusFlotantes(): void {
    this.menuPerfilAbierto.set(false);
    this.menuNotificacionesAbierto.set(false);
  }

  /**
   * Escape: cierra los desplegables del encabezado Y el cajón de celular.
   * El cajón es un diálogo modal y se espera que Escape lo cierre.
   */
  protected cerrarConEscape(): void {
    this.cerrarMenusFlotantes();
    this.menuAbierto.set(false);
    if (this.panelNotificacionesAbierto()) {
      this.cerrarPanelNotificaciones();
    }
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
