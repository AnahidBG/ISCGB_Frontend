# Antes de armar una pantalla nueva

Checklist rápido para no repetir trabajo ni reinventar piezas que ya existen.
Nace del caso de `control-legajos`: se armó dos veces en paralelo (una en
`features/secretario/`, otra en `pages/`) porque la segunda no sabía que la
primera ya estaba.

---

## 1. ¿Ya existe?

Antes de crear una carpeta nueva, buscar en `src/app/features/` si la
pantalla (o algo muy parecido) ya está. Si existe, el trabajo es **editarla o
extenderla ahí mismo** — nunca crear una segunda versión en paralelo.

Si hay dudas de si alguien más ya la está tocando, preguntar en el grupo del
equipo antes de arrancar. Dos personas armando la misma pantalla sin saberlo
es tiempo perdido para una de las dos.

## 2. ¿Dónde va la carpeta?

```
src/app/
├── core/       → singletons: guards, interceptors, servicios, modelos de datos
├── shared/ui/  → componentes reutilizables ENTRE roles (botón, badge, panel...)
└── features/   → una carpeta por área/rol: features/<rol>/<pantalla>/
```

No existe una carpeta `pages/` en este proyecto — las pantallas van en
`features/<rol o área>/<nombre-pantalla>/`. Si algo se repite entre dos
features, se muda a `shared/ui/`, no se copia.

## 3. La estructura del panel ya existe: `EstructuraPanel`

Ninguna pantalla arma su propia barra lateral. El shell común (barra lateral +
encabezado) es `<app-estructura-panel>`, en
`shared/ui/estructura-panel/estructura-panel.ts`. Se usa así:

```html
<app-estructura-panel [enlaces]="enlaces()" ...>
  <!-- el contenido de tu pantalla acá adentro -->
</app-estructura-panel>
```

## 4. El menú de enlaces tampoco se escribe a mano

No declarar un array `menuItems` propio en cada pantalla. Existe una sola
función, `enlacesPorSesion(sesion)`, en
`shared/ui/estructura-panel/enlaces-por-rol.ts`, que arma el menú según el rol
de la sesión — la usan todas las pantallas. Antes cada una tenía su propia
lista y eso generaba enlaces desincronizados entre paneles; por eso se
centralizó.

## 5. Los datos van por servicio + modelo, no hardcodeados

Los modelos de cada dominio (legajos, justificativos, usuarios...) ya están en
`core/<dominio>/modelos/`, calcados del contrato real de la API
(`docs/contrato-api.md`). Los servicios están en `core/<dominio>/*.service.ts`.
No inventar una interfaz local con forma parecida "a ojo" — usar la que ya
existe, o si de verdad falta un campo, ampliarla ahí (avisando al equipo).

## 6. Convención de nombres

- Sin sufijo `.component` en el archivo: `control-legajos.ts`, no
  `control-legajos.component.ts`.
- La clase tampoco lleva el sufijo `Component`: `export class ControlLegajos`,
  no `ControlLegajosComponent`. Fijate cómo se importa en `app.routes.ts` —
  ese es el nombre real que tiene que exportar el archivo.
- `standalone: true` no hace falta escribirlo (Angular 21 ya es standalone por
  defecto).
- No crear un `.scss` por componente salvo que haga falta algo que Tailwind no
  resuelva. La mayoría de las pantallas van con clases de Tailwind directo en
  el HTML.

## 7. Mirar los tokens y componentes antes de escribir HTML a mano

Correr `npm start` y entrar a `localhost:4200/sistema-diseno`: ahí está el
muestrario en vivo de los componentes (`<app-boton>`, `<app-campo-formulario>`,
`<app-insignia-estado>`...) y los colores/tipografía reales. Componer la
pantalla con esas piezas en vez de escribir `<button>` o colores a mano.

## 8. Una pantalla real como plantilla

`features/secretario/control-legajos/` es un buen ejemplo completo: contenedor
+ presentacional (`partes/fila-documento-legajo/`), `EstructuraPanel`,
`enlacesPorSesion`, modelos reales, `LegajoService`. Ante la duda de "¿cómo se
arma esto acá?", es más rápido copiar el patrón de ahí que preguntar.
