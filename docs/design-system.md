# Sistema de diseño: del Figma al código

Sale del Manual de Identidad ICGB y del Design System de Figma. Está
implementado en `src/styles.scss` y en `src/app/shared/ui/`.

El muestrario en vivo está en `/sistema-diseno`: dibuja los componentes reales
con los tokens reales. Si cambia un color en `styles.scss`, esa página cambia
sola.

## Colores

### Los del manual

| Nombre | Hex | Token |
| --- | --- | --- |
| Verde grisáceo oscuro, el color principal | `#46695F` | `principal` |
| Verde claro | `#90C997` | `acento-verde` |
| Amarillo verdoso suave | `#CFD18D` | `acento-lima` |
| Verde menta | `#CBFFD1` | `menta` |
| Blanco humo | `#F5F5F5` | `humo` |
| Gris verdoso suave | `#919D99` | `gris-marca` |

### Contraste medido

WCAG 2.1 pide 4,5:1 para texto normal.

| Combinación | Relación | Resultado |
| --- | --- | --- |
| Verde principal con texto blanco | 6,09:1 | Cumple AA |
| Verde claro con texto oscuro | 7,21:1 | Cumple AAA |
| Amarillo verdoso con texto oscuro | 8,63:1 | Cumple AAA |
| Verde menta con texto oscuro | 12,31:1 | Cumple AAA |
| Amarillo verdoso con verde principal | 3,82:1 | Solo títulos grandes |
| Verde claro con texto blanco | 1,91:1 | No usar nunca |
| Gris verdoso sobre blanco | 2,80:1 | No sirve para texto |

**El gris verdoso `#919D99` no alcanza para texto.** Queda para trazos
decorativos y bordes. Para texto secundario y placeholders se usa `#666E6B`,
que mantiene el matiz y da 4,81:1.

Conviene corregirlo también en el manual de identidad. Si alguien del equipo
toma el gris del manual para un texto, el problema vuelve.

### Derivados

No están en el manual. Hicieron falta porque el manual define colores, pero no
estados.

| Token | Hex | Para qué |
| --- | --- | --- |
| `principal-oscuro` | `#35504A` | Hover y press del botón secundario |
| `acento-verde-claro` | `#B8DDB4` | Botón primario en reposo |
| `acento-verde-press` | `#7AAB80` | Botón primario presionado |
| `texto-suave` | `#666E6B` | Texto secundario accesible |
| `texto` | `#2D2D2D` | Texto principal |
| `borde` | `#E2E8E4` | Bordes de campos y divisores |

### Colores de estado

Son los del semáforo de documentos: `aprobado` (`#2F8F5B`), `pendiente`
(`#B07D0A`) y `rechazado` (`#C0392B`).

Medidos el 06/10/2026, **`aprobado` y `pendiente` no llegan a AA como texto**:
dan 4,04:1 y 3,63:1 sobre blanco, y menos sobre su propio fondo al 10 %
(3,59:1 y 3,25:1). `rechazado` sí llega, con 5,44:1.

En los componentes nuevos el color de estado va en el ícono y el borde, donde
alcanza con 3:1, y el texto va en `texto`. `insignia-estado` todavía usa el
color como texto.

## Tipografía

- **Gasoek One**, para títulos: `font-titulo`.
- **Geist**, para contenido: `font-cuerpo`.
- **Geist Mono**, para piezas digitales: `font-mono`.

Se cargan desde Google Fonts en `index.html` con `display=swap`, para que el
texto se lea con la fuente de respaldo mientras baja la definitiva, en vez de
quedar invisible.

Gasoek One tiene un solo peso. Pedirle negrita hace que el navegador la
falsifique estirando los trazos, y queda sucia. Por eso `.font-titulo` fija
`font-weight: 400`.

### El manual y el diseño del login no coinciden

El manual dice "Gasoek One para títulos". Pero en el diseño del login, el
título grande y "Bienvenido" están dibujados con la tipografía de contenido en
negrita.

No es un error. Gasoek One es una tipografía muy pesada, pensada para piezas de
comunicación. En una pantalla donde alguien viene a hacer un trámite resulta
ruidosa.

Por eso el código no fuerza `font-titulo` en todos los `h1`, `h2` y `h3`. Las
piezas de marca usan `class="font-titulo"` y las pantallas del sistema quedan,
por defecto, en Geist en negrita.

Falta confirmarlo con diseño y dejarlo escrito en el manual, para que no se
resuelva distinto en cada pantalla.

## Grilla

| | Escritorio | Celular |
| --- | --- | --- |
| Columnas | 12 | 4 |
| Ancho de columna | 70 px | 78 px |
| Separación | 32 px | 16 px |
| Margen | 120 px | 16 px |
| Lienzo | 1440 px | 392 px |

### El lienzo de Figma no es el ancho de la pantalla

Acá el diseño y el código dejan de ser lo mismo. Una MacBook de 16" tiene
1728 px de ancho real y el lienzo de Figma es de 1440; un iPhone 16 Pro Max
tiene 440 y el lienzo es de 392. Ninguno coincide, y entre esos extremos hay
cientos de anchos posibles. Figma es una foto a un ancho; el código tiene que
verse bien en todos.

Por eso `.contenedor` limita el contenido a 1440 px y lo centra. En una MacBook
sobra aire a los costados, que es lo correcto: si el texto se estirara a
1728 px, las líneas quedarían tan largas que el ojo se pierde al volver al
renglón siguiente. En celular el contenido se estira hasta donde dé, con 16 px
de margen.

Los quiebres se manejan con `lg:`, a partir de 1024 px, y no con dos diseños
separados.

## Componentes

### `<app-boton>`

Tiene los tres niveles del Design System:

- `primario`: verde claro con texto oscuro, en forma de pastilla. Es la acción
  principal.
- `secundario`: verde institucional con texto blanco. Acción de apoyo.
- `terciario`: solo texto. Navegación y acciones menores.

```html
<app-boton nivel="primario">Iniciá tu camino</app-boton>
<app-boton nivel="secundario" href="/login">Portal de Autogestión</app-boton>
<app-boton nivel="terciario" [conFlecha]="false">Inicio</app-boton>
```

Si recibe `href` se dibuja como `<a>`; si no, como `<button>`. Un enlace lleva
a otro lado y se puede abrir en una pestaña nueva; un botón ejecuta algo acá.
Confundirlos rompe la navegación por teclado.

Los estados (hover, press, focus y disabled) se resuelven con variantes de CSS
y no con JavaScript.

Un detalle de Angular: `<ng-content />` proyecta el contenido una sola vez,
aunque se escriba en las dos ramas de un `@if`. La segunda queda vacía. Se
declara una vez en un `<ng-template>` y se usa con `ngTemplateOutlet` en las
dos. Así está resuelto en `boton.html`.

### `<app-encabezado>`

Es la navegación institucional. En escritorio los enlaces van en fila y en
celular se guardan detrás del botón de menú.

```html
<app-encabezado urlAutogestion="/login" />
```

El acceso al Portal de Autogestión va después de Contacto y dibujado como
botón, no como enlace de texto: los otros cuatro llevan a secciones del mismo
sitio y este lleva a entrar a un sistema.

### Los demás

`<app-campo-formulario>`, `<app-pantalla-carga>` y el resto de `shared/ui/` se
ven en el muestrario, en `/sistema-diseno`.

## Brochero Design System

El 27/08/2026 se incorporó a `styles.scss` un segundo sistema de diseño de la
marca, armado aparte a partir de cuatro imágenes: el logo en sus tres colores y
el isotipo. Se tomó lo que aportaba de nuevo, sin pisar nada confirmado.

Sus tres colores de marca son exactamente los oficiales de acá: `#46695F`,
`#CFD18D` y `#919D99`. Que dos sistemas armados con fuentes distintas lleguen
al mismo número es una buena señal.

Lo que se sumó:

- La escala completa de esos tres colores, de `principal-50` a `principal-900`
  y lo mismo para `acento-lima` y `gris-marca`. Son tokens nuevos, que no
  reemplazan a los que ya existían.
- `radius-tarjeta`, de 20 px, y `radius-control`, la pastilla. Tienen nombre
  propio y no pisan la escala de Tailwind.
- `shadow-marca-sm`, `md` y `lg`: sombras con tinte verde en vez de negro.

Lo que no se tocó:

- La tipografía. Ese sistema recomienda Barlow, pero como sustitución a falta
  de dato: se armó sin los archivos de fuente. Gasoek One y Geist, en cambio,
  están confirmadas desde el Figma real.
- `acento-verde` y `menta`. Ese sistema no los tiene, porque su fuente no
  incluía la diapositiva del manual que los define. Acá son oficiales.
- Sus componentes de encabezado, pie y loader. Se hicieron para el sitio
  público del instituto, que es otro proyecto con la misma marca.

## Pendientes

1. El Figma no tiene variables. Los colores están escritos en una diapositiva
   del manual y cada capa se pinta a mano. Crearlas lleva media hora y ordena
   todo.
2. Validar los derivados contra el Figma del Design System, que tiene los
   estados dibujados.
3. Corregir el gris `#919D99` en el manual, o aclarar ahí mismo que es
   decorativo.
4. Oscurecer `aprobado` y `pendiente` para que lleguen a AA como texto, o
   definir que solo se usan en íconos y bordes. Cambia todas las pantallas, así
   que es una decisión de diseño.
5. La iconografía. El Design System define íconos para dropdowns, cards,
   requisitos y roles que todavía no están en código.
6. Si el instituto confirma la tipografía real del logo, es un cambio de una
   línea en `--font-titulo` y `--font-cuerpo`.
7. Decidir si los derivados sueltos (`principal-oscuro`, `acento-verde-claro`)
   se migran a la escala nueva (`principal-600` y demás).
