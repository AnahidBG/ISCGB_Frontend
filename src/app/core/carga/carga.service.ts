import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

/**
 * Cuánto esperamos antes de mostrar el loader.
 *
 * Si una llamada tarda 80ms, mostrar y esconder el logo en ese lapso es un
 * parpadeo molesto que además hace ver la app como si estuviera fallando.
 * Por debajo de este umbral no se muestra nada: la respuesta llega antes.
 */
const DEMORA_APARICION_MS = 150;

/**
 * Cuánto se queda como mínimo una vez que apareció.
 *
 * Es el otro extremo del mismo problema: si el loader alcanzó a dibujarse y
 * la respuesta llega 20ms después, sacarlo de golpe también parpadea. Se
 * queda este mínimo aunque el trabajo ya haya terminado.
 */
const MINIMO_VISIBLE_MS = 400;

/**
 * El estado de espera GLOBAL de la aplicación.
 *
 * "Global" quiere decir: algo que justifica tapar la pantalla entera —
 * arrancar la app, navegar a una pantalla que necesita datos, una llamada
 * HTTP que bloquea todo. Lo dibuja `<app-cargador-global>`, montado una sola
 * vez en `app.html`.
 *
 * ⚠️ REGLA IMPORTANTE: esto NO se usa para una espera que pasa adentro de una
 * caja (el historial de un panel lateral, una tabla, un modal, un tab). Para
 * eso, el componente maneja su propio `signal(false)` y dibuja
 * `<app-pantalla-carga>` directamente. Si usás este servicio ahí, un panel
 * lateral chiquito termina tapando toda la pantalla, y peor: dos esperas
 * simultáneas se pelean por el mismo estado.
 *
 * Se cuenta con un CONTADOR y no con un booleano a propósito. Con booleano
 * pasa esto: arrancan dos llamadas, la primera termina y pone `false`, y el
 * loader desaparece mientras la segunda sigue corriendo. Con contador, el
 * loader se va recién cuando la última terminó.
 */
@Injectable({ providedIn: 'root' })
export class CargaService {
  private readonly contador = signal(0);

  /** ¿Hay algo en curso? Es el estado REAL, sin las reglas anti-parpadeo. */
  readonly activo = computed(() => this.contador() > 0);

  /**
   * ¿Hay que DIBUJAR el loader?
   *
   * Distinto de `activo`: este ya tiene aplicadas la demora de aparición y el
   * mínimo visible. Es el que mira el componente.
   */
  private readonly mostrandose = signal(false);
  readonly visible = this.mostrandose.asReadonly();

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private aparecioEn = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelarTemporizador());

    // El efecto depende SOLO de `activo`. Los `untracked` alrededor de
    // `mostrandose` son a propósito: sin ellos, el efecto se volvería a
    // disparar cada vez que él mismo cambia esa señal, y habría que razonar
    // sobre si eso cicla o no. Así la única entrada es "¿hay trabajo?".
    effect(() => {
      const hayTrabajo = this.activo();
      this.cancelarTemporizador();

      const yaVisible = untracked(() => this.mostrandose());

      if (hayTrabajo) {
        // Ya visible (de una tanda anterior que no llegó a cerrarse): no
        // reiniciamos nada, el loader simplemente sigue.
        if (yaVisible) {
          return;
        }

        this.temporizador = setTimeout(() => {
          this.aparecioEn = Date.now();
          this.mostrandose.set(true);
        }, DEMORA_APARICION_MS);
        return;
      }

      // Terminó el trabajo. Si nunca llegó a dibujarse, no hay nada que
      // esconder — y ese es justamente el caso que evita el parpadeo.
      if (!yaVisible) {
        return;
      }

      const visibleHace = Date.now() - this.aparecioEn;
      const restante = Math.max(0, MINIMO_VISIBLE_MS - visibleHace);

      if (restante === 0) {
        this.mostrandose.set(false);
        return;
      }

      this.temporizador = setTimeout(() => this.mostrandose.set(false), restante);
    });
  }

  /** Suma una espera. Siempre tiene que tener su `ocultar()` correspondiente. */
  mostrar(): void {
    this.contador.update((n) => n + 1);
  }

  /**
   * Resta una espera.
   *
   * El `Math.max(0, ...)` es una red de seguridad: si por un bug alguien
   * llama `ocultar()` de más, el contador no queda en negativo — porque un
   * contador negativo dejaría el loader "roto" (nunca más se muestra) de una
   * forma muy difícil de rastrear.
   */
  ocultar(): void {
    this.contador.update((n) => Math.max(0, n - 1));
  }

  /**
   * Envuelve una promesa mostrando el loader mientras corre.
   *
   * Es la forma segura de usarlo a mano: el `finally` garantiza que se
   * oculte aunque la promesa falle. Hacerlo con `mostrar()` / `ocultar()`
   * sueltos es donde aparecen los loaders que quedan pegados para siempre.
   */
  async envolver<T>(trabajo: Promise<T>): Promise<T> {
    this.mostrar();
    try {
      return await trabajo;
    } finally {
      this.ocultar();
    }
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
