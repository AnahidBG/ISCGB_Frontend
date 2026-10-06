# Antes de armar una pantalla nueva

Una lista corta para no repetir trabajo ni reinventar piezas que ya existen.
Nace de un caso real: `control-legajos` se armó dos veces en paralelo, una en
`features/secretario/` y otra en `pages/`, porque la segunda persona no sabía
que la primera ya estaba.

## 1. Fijate si ya existe

Buscá en `src/app/features/` si la pantalla, o algo muy parecido, ya está. Si
existe, se edita o se extiende ahí mismo. Nunca se arma una segunda versión en
paralelo.

Si dudás de que alguien más la esté tocando, preguntá en el grupo antes de
arrancar.

## 2. Dónde va la carpeta

```text
src/app/
├── core/       guards, interceptores, servicios y modelos de datos
├── shared/ui/  componentes reutilizables entre roles
└── features/   una carpeta por rol o área: features/<rol>/<pantalla>/
```

No existe la carpeta `pages/`. Si algo se repite entre dos features, se muda a
`shared/ui/`; no se copia.

## 3. El marco del panel ya está

Ninguna pantalla arma su propia barra lateral ni su encabezado. Eso lo resuelve
`<app-estructura-panel>`, en `shared/ui/estructura-panel/estructura-panel.ts`:

```html
<app-estructura-panel [enlaces]="enlaces()" ...>
  el contenido de tu pantalla
</app-estructura-panel>
```

## 4. El menú tampoco se escribe a mano

No declares un array de enlaces en cada pantalla. `enlacesPorSesion(sesion)`,
en `shared/ui/estructura-panel/enlaces-por-rol.ts`, arma el menú según el rol
de la sesión y lo usan todas las pantallas. Antes cada una tenía su lista y los
enlaces quedaban distintos entre paneles.

## 5. Los datos salen de un servicio y un modelo

Los modelos de cada dominio están en `core/<dominio>/modelos/`, calcados del
contrato real de la API (`docs/contrato-api.md`), y los servicios en
`core/<dominio>/*.service.ts`. No inventes una interfaz local parecida "a ojo".
Si de verdad falta un campo, se agrega ahí y se avisa al equipo.

## 6. Nombres

El archivo va sin el sufijo `.component`: `control-legajos.ts`. La clase
tampoco lleva `Component`: `export class ControlLegajos`. Mirá cómo se importa
en `app.routes.ts`, que es el nombre que tiene que exportar el archivo.

`standalone: true` no se escribe: en Angular 21 es el valor por defecto.

No crees un `.scss` por componente salvo que haga falta algo que Tailwind no
resuelve.

## 7. Mirá el muestrario antes de escribir HTML

Con `npm start`, en `localhost:4200/sistema-diseno` está el muestrario en vivo
de los componentes (`<app-boton>`, `<app-campo-formulario>`,
`<app-insignia-estado>`) con los colores y la tipografía reales. Armá la
pantalla con esas piezas en vez de escribir un `<button>` o un color a mano.

## 8. Una pantalla para copiar

`features/secretario/frecuencia-avisos/` es un ejemplo chico y completo: un
contenedor, un presentacional en `partes/formulario-frecuencia/`,
`EstructuraPanel`, `enlacesPorSesion` y un servicio de `core/`. Ante la duda de
cómo se arma algo acá, copiá el patrón de ahí.
