# Loader del logo — global y reutilizable

Fecha: **27/08/2026**

Una sola animación del logo, invocable de dos formas distintas, sin duplicar
el SVG ni los keyframes en ningún lado.

## Las piezas

```
shared/ui/pantalla-carga/     → <app-pantalla-carga>. El componente TONTO:
                                 solo dibuja el logo. No sabe si es global o
                                 local, no habla con ningún servicio.

core/carga/carga.service.ts   → CargaService. El estado de espera GLOBAL,
                                 con contador y reglas anti-parpadeo.

core/carga/cargador-global.*  → <app-cargador-global>. El overlay de pantalla
                                 completa. Montado UNA vez en app.html.

core/carga/carga.interceptor  → cargaInterceptor + SIN_CARGA_GLOBAL. Dispara
                                 el loader global en cada llamada HTTP.
```

La regla que sostiene todo: **`CargaService` nunca se usa adentro de un
componente que espera algo local.** Cada loader embebido maneja su propio
`signal(false)`. Si no se respeta, un panel lateral chiquito termina tapando
la pantalla entera, y dos esperas simultáneas se pelean por el mismo estado.

## Caso 1 — espera global

No hay nada que montar: `<app-cargador-global>` ya está en `app.html`.

**Automático en cada llamada HTTP.** `cargaInterceptor` está registrado en
`app.config.ts`, así que cualquier `this.http.get(...)` ya muestra el logo
mientras dure. No hay que hacer nada.

**A mano, desde cualquier componente:**

```ts
private readonly carga = inject(CargaService);

async guardar(): Promise<void> {
  await this.carga.envolver(algoQueTarda());
}
```

`envolver()` es más seguro que `mostrar()` / `ocultar()` sueltos: el `finally`
interno garantiza que se oculte aunque el trabajo falle. Los loaders que
quedan pegados para siempre salen casi siempre de un `ocultar()` que no se
ejecutó por un error en el medio.

**Al arrancar la app**, si en algún momento hay datos iniciales que esperar:

```ts
// app.ts
private readonly carga = inject(CargaService);

ngOnInit(): void {
  this.carga.envolver(firstValueFrom(this.datosIniciales$));
}
```

Todavía no está enganchado porque la app no tiene datos iniciales que cargar
antes de mostrar la primera pantalla. Cuando los tenga, es esa línea.

## Caso 2 — espera local (un panel, una tabla, un modal)

El mismo componente visual, con estado propio e independiente:

```ts
@Component({
  selector: 'app-historial',
  imports: [PantallaCarga],
  template: `
    <aside class="panel-lateral">
      @if (cargandoHistorial()) {
        <app-pantalla-carga tamano="lg" mensaje="Cargando historial…" />
      } @else {
        <!-- la lista real -->
      }
    </aside>
  `,
})
export class Historial {
  private readonly http = inject(HttpClient);
  protected readonly cargandoHistorial = signal(false);

  cargar(): void {
    this.cargandoHistorial.set(true);

    this.http
      .get<Movimiento[]>(url, {
        // Sin esto, además del loader del panel se dispararía el overlay
        // global y taparía toda la pantalla.
        context: new HttpContext().set(SIN_CARGA_GLOBAL, true),
      })
      .pipe(finalize(() => this.cargandoHistorial.set(false)))
      .subscribe(/* … */);
  }
}
```

Ese es el patrón completo, y se repite igual en cualquier otro lugar: signal
local + `SIN_CARGA_GLOBAL` + `<app-pantalla-carga>`. **Nunca copiar el SVG ni
los keyframes** — siempre reusar el componente.

## Tamaños y tonos

| `tamano` | Logo | Para qué |
|---|---|---|
| `sm` | 24px | Inline, adentro de una fila o una card chica |
| `md` | 48px | El default. Una sección de una pantalla |
| `lg` | 96px | Un panel lateral, un modal, media pantalla |
| `completo` | 140px | Solo el overlay global |

| `tono` | Aspecto |
|---|---|
| `claro` | Logo verde sobre fondo claro — el caso normal |
| `verde` | Logo blanco sobre el verde institucional — splash de arranque |

El SVG usa `currentColor`, así que el tono se resuelve cambiando `color` en el
contenedor. Por eso el componente **no sabe nada de temas**: si algún día la
app tiene modo oscuro, hereda el color solo, sin tocar este archivo.

Para embeberlo sobre un fondo que ya existe (como hace el overlay global sobre
su desenfoque), pasarle `style="--carga-fondo: transparent"` para que no pinte
su propio fondo encima.

## Anti-parpadeo — por qué hay dos temporizadores

`CargaService` no expone el estado crudo al componente. Expone `visible`, que
ya tiene aplicadas dos reglas:

1. **Demora de aparición (150ms).** Si la respuesta llega antes, el loader no
   se muestra nunca. Mostrar y esconder el logo en 80ms es un parpadeo que
   además hace ver la app como si estuviera fallando.
2. **Mínimo visible (400ms).** Si el loader alcanzó a dibujarse y la respuesta
   llega 20ms después, igual se queda ese mínimo. Es el mismo problema por el
   otro extremo.

Y el estado es un **contador, no un booleano**. Con booleano pasa esto:
arrancan dos llamadas, la primera termina y pone `false`, y el loader
desaparece mientras la segunda sigue corriendo. Con contador se va recién
cuando terminó la última.

## Accesibilidad

- `role="status"` + `aria-live="polite"` en el host de `<app-pantalla-carga>`:
  un lector de pantalla anuncia el mensaje sin interrumpir lo que esté
  leyendo. El SVG va con `aria-hidden` para que no se escuche dos veces.
- `aria-busy="true"` en el overlay global.
- `prefers-reduced-motion`: para quien pidió menos movimiento en su sistema
  operativo, el logo se ve sólido y quieto, con una respiración muy suave que
  alcanza para entender que el sistema está trabajando. No es opcional —
  el movimiento en pantalla le produce mareo o migraña a mucha gente.
- Un loader local nunca usa `position: fixed` ni bloquea el scroll de afuera
  de su contenedor.

## Lo que quedó afuera, y por qué

- **Angular Material (`mat-drawer`).** La spec original lo daba por
  disponible, pero este proyecto no tiene Material instalado
  (`package.json` solo trae `@angular/{common,compiler,core,forms,
  platform-browser,router}`). El patrón de arriba funciona igual en cualquier
  contenedor; si algún día se agrega Material, se usa idéntico adentro de un
  `<mat-drawer position="end">` sin cambiar nada del loader.
- **Servicio de tema / modo oscuro completo.** La app no tiene modo oscuro
  todavía, y agregarlo entero era mucho más grande que "hacer el loader".
  El componente ya está preparado (hereda `color`), así que el día que exista
  no hay que volver acá.
- **La versión Web Component (framework-agnostic).** Es para el sitio público
  institucional, que es otro proyecto — el mismo `Brochero Design System`
  ya trae `ui_kits/sitio/carga-standalone.html`, que es exactamente eso:
  HTML + CSS sin dependencias, listo para pegar.

## Checklist de aceptación

- [ ] El overlay global aparece durante una llamada HTTP larga y desaparece al
      terminar.
- [ ] Una llamada de menos de 150ms no hace parpadear nada.
- [ ] Dos llamadas simultáneas: el loader se va recién con la segunda.
- [ ] Una llamada marcada con `SIN_CARGA_GLOBAL` no dispara el overlay.
- [ ] Un loader local se queda adentro de su caja y no bloquea el resto.
- [ ] Con "reducir movimiento" activado, el logo se ve sólido y quieto.
- [ ] `tono="verde"` muestra el logo blanco sobre verde institucional.
