# El loader del logo

Del 27/08/2026, revisado el 06/10/2026.

Hay una sola animación del logo y se puede usar de dos formas, global o local,
sin duplicar el SVG ni los keyframes.

## Las piezas

- `shared/ui/pantalla-carga/`: `<app-pantalla-carga>`, el componente que dibuja
  el logo. No sabe si es global o local y no habla con ningún servicio.
- `core/carga/carga.service.ts`: `CargaService`, el estado de espera global,
  con contador y reglas para que no parpadee.
- `core/carga/cargador-global`: `<app-cargador-global>`, el velo de pantalla
  completa. Está montado una sola vez, en `app.html`.
- `core/carga/carga.interceptor.ts`: `cargaInterceptor` y `SIN_CARGA_GLOBAL`.
  Dispara el loader global en cada llamada HTTP.

La regla que sostiene todo: **`CargaService` nunca se usa adentro de un
componente que espera algo local.** Cada loader embebido maneja su propio
`signal`. Si no, un panel chico termina tapando la pantalla entera y dos
esperas simultáneas se pelean por el mismo estado.

## Espera global

No hay nada que montar ni que llamar. `cargaInterceptor` está registrado en
`app.config.ts`, así que cualquier pedido HTTP muestra el logo mientras dura.

Para algo que tarda y no es HTTP, se usa a mano:

```ts
private readonly carga = inject(CargaService);

async guardar(): Promise<void> {
  await this.carga.envolver(algoQueTarda());
}
```

`envolver()` es más seguro que `mostrar()` y `ocultar()` sueltos: su `finally`
garantiza que el loader se oculte aunque el trabajo falle. Los loaders que
quedan pegados para siempre salen casi siempre de un `ocultar()` que no se
ejecutó por un error en el medio.

## Espera local: un panel, una tabla, un modal

Es el mismo componente visual, con un estado propio:

```ts
@Component({
  selector: 'app-historial',
  imports: [PantallaCarga],
  template: `
    @if (cargando()) {
      <app-pantalla-carga tamano="lg" mensaje="Cargando historial…" />
    } @else {
      <ul>…</ul>
    }
  `,
})
export class Historial {
  private readonly movimientos = inject(MovimientosService);
  protected readonly cargando = signal(false);

  cargar(): void {
    this.cargando.set(true);

    this.movimientos
      .listar({ enSegundoPlano: true })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe();
  }
}
```

`enSegundoPlano` es lo que evita que, además del loader del panel, se dispare
el velo global. Es una opción de dominio (`OpcionesPedido`): el servicio
abstracto no sabe de HTTP, y cada `*-http.service.ts` la traduce a
`SIN_CARGA_GLOBAL` con `contextoDePedido()`. La campana la usa en todos sus
pedidos.

El patrón es siempre ese: un signal local, el pedido en segundo plano y
`<app-pantalla-carga>`. Nunca se copia el SVG ni los keyframes.

## Tamaños y tonos

`tamano` acepta cuatro valores:

- `sm`, 24 px: en línea, adentro de una fila o de una tarjeta chica.
- `md`, 48 px: el valor por defecto, para una sección de una pantalla.
- `lg`, 96 px: un panel lateral, un modal o media pantalla.
- `completo`, 140 px: solo para el velo global.

`tono` acepta `claro`, que es el logo verde sobre fondo claro, y `verde`, el
logo blanco sobre el verde institucional, pensado para una pantalla de
arranque.

El SVG usa `currentColor`, así que el tono se resuelve cambiando `color` en el
contenedor. El componente no sabe nada de temas: si algún día hay modo oscuro,
hereda el color solo.

Para ponerlo sobre un fondo que ya existe, como hace el velo global sobre su
desenfoque, se le pasa `style="--carga-fondo: transparent"`.

## Por qué no parpadea

`CargaService` no expone el estado crudo. Expone `visible`, que ya tiene
aplicadas dos reglas.

La primera es una demora de 150 ms antes de aparecer. Si la respuesta llega
antes, el loader no se muestra nunca. Mostrarlo y esconderlo en 80 ms es un
parpadeo que hace ver la app como si estuviera fallando.

La segunda es un mínimo de 400 ms visible. Si el loader alcanzó a dibujarse y
la respuesta llega 20 ms después, se queda igual ese mínimo.

Además el estado es un contador y no un booleano. Con un booleano, arrancan dos
llamadas, la primera termina y lo pone en `false`, y el loader desaparece
mientras la segunda sigue corriendo. Con el contador se va recién cuando
terminó la última.

## Accesibilidad

- El host de `<app-pantalla-carga>` tiene `role="status"` y `aria-live="polite"`:
  un lector de pantalla anuncia el mensaje sin interrumpir lo que esté leyendo.
  El SVG va con `aria-hidden` para que no se escuche dos veces.
- El velo global tiene `aria-busy="true"`.
- Con `prefers-reduced-motion`, el logo se ve sólido y quieto, con una
  respiración muy suave que alcanza para entender que el sistema está
  trabajando. A mucha gente el movimiento en pantalla le produce mareo o
  migraña.
- Un loader local nunca usa `position: fixed` ni bloquea el scroll de afuera de
  su contenedor.

## Lo que quedó afuera

Angular Material. La especificación original daba por disponible `mat-drawer`,
pero el proyecto no tiene Material instalado. El patrón funciona igual en
cualquier contenedor.

Un servicio de tema con modo oscuro. La app no tiene modo oscuro y agregarlo
era mucho más grande que hacer el loader. El componente ya hereda `color`, así
que no habrá que volver acá.

La versión como Web Component, sin framework. Es para el sitio público del
instituto, que es otro proyecto.

## Qué tiene que cumplir

- [ ] El velo global aparece durante una llamada HTTP larga y desaparece al
      terminar.
- [ ] Una llamada de menos de 150 ms no hace parpadear nada.
- [ ] Con dos llamadas simultáneas, el loader se va recién con la segunda.
- [ ] Un pedido en segundo plano no dispara el velo.
- [ ] Un loader local se queda adentro de su caja y no bloquea el resto.
- [ ] Con "reducir movimiento" activado, el logo se ve sólido y quieto.
- [ ] `tono="verde"` muestra el logo blanco sobre el verde institucional.
