import { DOCUMENT, DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  ATRIBUTO_TEMA,
  CLAVE_PREFERENCIA_TEMA,
  CONSULTA_SISTEMA_OSCURO,
  PreferenciaTema,
  TemaAplicado,
  leerPreferenciaTema,
  resolverTema,
  temaOpuesto,
} from './tema';

/**
 * El tema visual de toda la aplicación: qué eligió la persona, qué tema se
 * pinta y cómo se lo avisa a la hoja de estilos.
 *
 * Los colores no se cambian desde acá. Este servicio solo pone
 * `data-tema="claro"` u `"oscuro"` en `<html>`, y `styles.scss` redefine las
 * variables de color cuando ve `oscuro`. Como todos los componentes pintan con
 * esas variables, el cambio llega a todas las pantallas sin tocar ninguna.
 *
 * Quién lo usa: `<app-selector-tema>`, que es el único lugar donde la persona
 * decide. Ninguna pantalla pregunta por el tema para elegir sus colores; si
 * una necesitara hacerlo, es señal de que le falta un token en `styles.scss`.
 *
 * La preferencia se guarda en `localStorage`, que es del NAVEGADOR y no de la
 * cuenta: cerrar sesión no la borra. No es un dato sensible y es justamente
 * lo que conviene que sobreviva entre visitas (distinto del token, que va en
 * `sessionStorage`). Si el almacenamiento no está disponible (modo privado
 * estricto, política del navegador) la elección vale para esta visita y nada
 * más: no es un error.
 *
 * Antes de que Angular arranque, un script de `index.html` ya dejó puesto el
 * tema correcto, para que no haya un destello claro en una pantalla oscura.
 * Acá se retoma desde ese punto.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly ventana = this.documento.defaultView;

  /**
   * La consulta que avisa si el dispositivo prefiere oscuro. Es `null` donde
   * el navegador no la ofrece (los tests de jsdom, por ejemplo), y ahí el
   * dispositivo cuenta como claro.
   */
  private readonly consulta =
    typeof this.ventana?.matchMedia === 'function'
      ? this.ventana.matchMedia(CONSULTA_SISTEMA_OSCURO)
      : null;

  /** Lo que la persona eligió: `claro`, `oscuro` o `sistema` (acompañar al dispositivo). */
  readonly preferencia = signal<PreferenciaTema>(leerPreferenciaTema(this.leerGuardada()));

  private readonly sistemaOscuro = signal(this.consulta?.matches ?? false);

  /** El tema que se está pintando ahora. */
  readonly tema = computed<TemaAplicado>(() =>
    resolverTema(this.preferencia(), this.sistemaOscuro()),
  );

  readonly esOscuro = computed(() => this.tema() === 'oscuro');

  constructor() {
    const consulta = this.consulta;
    if (consulta) {
      // Con `sistema`, si el dispositivo cambia (por ejemplo, anochece y el
      // sistema pasa solo a oscuro) la aplicación lo acompaña sin recargar.
      const alCambiar = (evento: MediaQueryListEvent) => this.sistemaOscuro.set(evento.matches);
      consulta.addEventListener('change', alCambiar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', alCambiar));
    }

    effect(() => this.aplicar(this.tema()));
  }

  /** Elige una preferencia y la recuerda para la próxima visita. */
  establecer(preferencia: PreferenciaTema): void {
    this.preferencia.set(preferencia);
    this.guardar(preferencia);
  }

  /**
   * Pasa al otro tema y fija esa elección: es lo que hace el botón de un solo
   * toque. Quien después quiera volver a acompañar al dispositivo lo elige en
   * el selector de tres opciones.
   */
  alternar(): void {
    this.establecer(temaOpuesto(this.tema()));
  }

  private aplicar(tema: TemaAplicado): void {
    const raiz = this.documento.documentElement;
    raiz.setAttribute(ATRIBUTO_TEMA, tema);

    // La barra del navegador en el celular toma este color. Se lee del propio
    // token de fondo para no escribir un hexadecimal acá: si el color de fondo
    // cambia en `styles.scss`, esto lo sigue solo.
    const meta = this.documento.querySelector('meta[name="theme-color"]');
    const fondo = this.ventana?.getComputedStyle(raiz).getPropertyValue('--color-fondo').trim();
    if (meta && fondo) {
      meta.setAttribute('content', fondo);
    }
  }

  private leerGuardada(): string | null {
    try {
      return this.ventana?.localStorage.getItem(CLAVE_PREFERENCIA_TEMA) ?? null;
    } catch {
      return null;
    }
  }

  private guardar(preferencia: PreferenciaTema): void {
    try {
      this.ventana?.localStorage.setItem(CLAVE_PREFERENCIA_TEMA, preferencia);
    } catch {
      // Sin almacenamiento la elección vale por esta visita. No es un error.
    }
  }
}
