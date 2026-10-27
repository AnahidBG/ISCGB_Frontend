# Sistema de diseño: del Figma al código

Sale del Manual de Identidad ICGB y del Design System de Figma. Está
implementado en `src/styles.scss` y en `src/app/shared/ui/`.

El muestrario en vivo está en `/sistema-diseno`: dibuja los componentes reales
con los tokens reales. Si cambia un color en `styles.scss`, esa página cambia
sola. Tiene el selector de tema, para ver cómo queda todo en claro y en oscuro.

Hay dos temas, claro y oscuro. Los colores de las tablas de abajo son los del
tema claro; cuáles cambian en el oscuro y a qué valor está en
[Tema oscuro](#tema-oscuro).

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
| `principal-oscuro` | `#35504A` | Final del degradé del login |
| `principal-solido-hover` | `#35504A` | Hover y press del botón secundario (cambia en el oscuro) |
| `acento-verde-claro` | `#B8DDB4` | Botón primario en reposo |
| `acento-verde-press` | `#7AAB80` | Botón primario presionado |
| `texto-suave` | `#666E6B` | Texto secundario accesible |
| `texto` | `#2D2D2D` | Texto principal |
| `borde` | `#E2E8E4` | Bordes de campos y divisores |

`principal-oscuro` era también el hover del botón. Al llegar el tema oscuro ese
trabajo pasó a `principal-solido-hover`, que tiene un valor propio en cada tema;
`principal-oscuro` quedó fijo y solo lo usa el degradé del login.

### Colores de estado

Son los del semáforo de documentos: `aprobado` (`#2F8F5B`), `pendiente`
(`#B07D0A`) y `rechazado` (`#C0392B`).

Medidos el 06/10/2026, **`aprobado` y `pendiente` no llegan a AA como texto**:
dan 4,04:1 y 3,63:1 sobre blanco, y menos sobre su propio fondo al 10 %
(3,59:1 y 3,25:1). `rechazado` sí llega, con 5,44:1.

En los componentes nuevos el color de estado va en el ícono y el borde, donde
alcanza con 3:1, y el texto va en `texto`. `insignia-estado` todavía usa el
color como texto.

Cuando el verde tiene que ir como texto hay un token aparte, `aprobado-texto`
(`#1F6B43`, agregado el 25/10/2026): da 6,48:1 sobre blanco y 6,15:1 sobre el
fondo de panel. Lo usan `requisitos-password` y el aviso "Las contraseñas
coinciden". `aprobado` sigue para íconos, bordes y barras. El rojo no necesita
uno aparte: `rechazado` da 5,44:1 sobre blanco y 5,16:1 sobre el fondo de panel.

Un botón "Aprobar" o "Rechazar" es otra cosa: un relleno con texto blanco
encima. Para eso están `aprobado-solido` y `rechazado-solido`, que valen lo
mismo que `aprobado` y `rechazado` en el tema claro y **no cambian** en el
oscuro (ver [Tema oscuro](#tema-oscuro)). Blanco sobre `aprobado-solido` da
4,04:1, igual que antes con `bg-aprobado`: no llega a 4,5:1 para texto chico.

## Tema oscuro

La persona elige entre **Claro**, **Oscuro** y **Automático**. Automático sigue
la configuración del dispositivo y es lo que queda si nunca eligió. La elección
se guarda en el navegador (`localStorage`, clave `iscgb.tema`) y se recuerda
entre visitas.

### Dónde se cambia

Siempre es el mismo componente, `<app-selector-tema>`:

- En el menú de la persona, arriba a la derecha del panel, bajo "Apariencia".
- En el cajón del celular, antes de "Cerrar Sesión".
- En Configuración, en la tarjeta "Apariencia".
- En el login, que no tiene menú: un botón redondo en la esquina superior
  derecha, de un solo toque (`variante="boton"`).

### Cómo funciona

Tailwind genera cada utilidad de color apuntando a una variable
(`bg-superficie` → `var(--color-superficie)`), también las que llevan
transparencia (`bg-rechazado/10`). Entonces alcanza con volver a definir las
variables cuando `<html>` tiene `data-tema="oscuro"`, y todas las pantallas
cambian sin que ningún componente sepa que existe un tema. Los valores oscuros
están en el bloque `:root[data-tema='oscuro']` de `src/styles.scss`.

Las piezas:

- `core/tema/tema.ts`: la lógica pura (qué se guardó, qué tema corresponde).
  Tiene su spec.
- `core/tema/tema.service.ts`: `TemaService` guarda la elección, escucha al
  dispositivo y pone `data-tema` en `<html>`. Lo arranca `App`.
- `shared/ui/selector-tema/`: el selector.
- Un script en el `<head>` de `index.html` que pone `data-tema` **antes del
  primer pintado**. Sin él, quien usa el tema oscuro vería un destello claro en
  cada recarga, mientras baja la aplicación. Repite a propósito las reglas de
  `tema.ts` (misma clave, mismo atributo, misma decisión): si cambia una, se
  cambia la otra. Si algún día se agrega una política de seguridad de contenido
  que no admita scripts en línea, necesita un nonce o pasar a un archivo aparte.
- `<meta name="theme-color">`: el color de la barra del navegador en el
  celular. Lo deja bien el script y lo mantiene `TemaService`.

### Reglas para una pantalla nueva

1. **No se escribe `dark:` ni un color a mano.** Se usan los tokens de siempre
   y el tema oscuro llega solo.
2. **Un relleno con texto blanco es `-solido`.** Un botón verde es
   `bg-principal-solido text-white` y su hover `hover:bg-principal-solido-hover`;
   los de aprobar y rechazar, `bg-aprobado-solido` y `bg-rechazado-solido`.
   `bg-principal text-white` se ve bien en claro y **no se lee en oscuro**:
   ahí `principal` es el verde claro.
3. **Un verde que se dibuja sobre la superficie es `principal`.** Enlaces,
   bordes, anillos de foco, texto de la opción elegida: `text-principal`,
   `border-principal`, `ring-principal`.
4. **`text-white` va solo sobre un relleno fijo** (`-solido` o el degradé del
   login). `text-superficie` sobre un relleno deja de servir: en oscuro la
   superficie es oscura.
5. **Texto sobre el verde claro de los botones primarios:**
   `text-texto-sobre-claro`, no `text-texto` (que en oscuro es casi blanco).
6. **Una imagen con versión por tema** se dibuja dos veces con las clases
   `solo-claro` y `solo-oscuro`; el tema muestra una. Hoy es el logo (verde
   sobre claro, blanco hueso sobre oscuro).
7. **Las sombras de la marca** son `shadow-marca-sm|md|lg`. Su color sale de
   las variables `--sombra-marca-*` y se vuelve negro en el tema oscuro. Las de
   Tailwind (`shadow-sm`, `shadow-lg`, `shadow-xl`) son negras al 10 % y sobre
   un fondo oscuro casi no se ven: no rompen nada, pero no ayudan.
8. **Si falta un color,** se agrega un token en `@theme` con su valor claro y
   se le da el oscuro en el bloque `data-tema='oscuro'`. Y se anota acá.

### Qué cambia con el tema

| Token | Claro | Oscuro | Para qué |
| --- | --- | --- | --- |
| `fondo` | `#F5F5F5` | `#121614` | Fondo de la página |
| `fondo-panel` | `#FAF9F5` | `#121614` | Fondo de las pantallas internas |
| `superficie` | `#FFFFFF` | `#1A201E` | Tarjetas, menús, diálogos |
| `humo` | `#F5F5F5` | `#232B28` | Lo elevado o apagado dentro de una tarjeta |
| `borde` | `#E2E8E4` | `#2E3935` | Separadores y bordes |
| `texto` | `#2D2D2D` | `#E6ECE9` | Texto principal |
| `texto-suave` | `#666E6B` | `#A2AFAA` | Texto secundario |
| `principal` | `#46695F` | `#90C997` | El verde "sobre la superficie" |
| `principal-suave` | `#EAF0EE` | `#223530` | Fondo tenue del verde |
| `principal-enfasis` | `#35504A` | `#B8DDB4` | Un enlace verde al pasar el mouse |
| `principal-solido-hover` | `#35504A` | `#4F7A6D` | Hover del relleno verde |
| `aprobado` | `#2F8F5B` | `#4FBF84` | Estado, como ícono, borde o tinte |
| `aprobado-texto` | `#1F6B43` | `#6CD39B` | El verde de "cumplido" como texto |
| `pendiente` | `#B07D0A` | `#E2B04A` | Estado |
| `rechazado` | `#C0392B` | `#F2877E` | Estado |
| `info` | `#4A6FA5` | `#7FA6DB` | La tarjeta de totales |
| `menta` | `#CBFFD1` | `#325E45` | Tinte de éxito |
| `pista` | `#CCD3D1` | `#3A4642` | La parte vacía de una barra de avance |
| `inactivo` | `#919D99` | `#3A4642` | Relleno de un botón verde deshabilitado |
| `velo` | `#2D2D2D` | `#000000` | Lo que tapa la pantalla detrás de un diálogo |
| `--sombra-marca-*` | verde oscuro al 8-12 % | negro al 35-50 % | Sombras de la marca |

### Qué no cambia

| Token | Hex | Por qué |
| --- | --- | --- |
| `principal-solido` | `#46695F` | Relleno con texto blanco: botones, la marca |
| `aprobado-solido` | `#2F8F5B` | Relleno con texto blanco |
| `rechazado-solido` | `#C0392B` | Relleno con texto blanco |
| `texto-sobre-claro` | `#2D2D2D` | Texto sobre los verdes claros, que siguen claros |
| `acento-verde`, `acento-verde-claro`, `acento-verde-press` | los de siempre | Botón primario |
| `principal-oscuro` | `#35504A` | Final del degradé del login |
| `gris-marca` | `#919D99` | Decorativo; sobre superficie oscura da 5,90:1 |
| `acento-lima` y las escalas `-50` a `-900` | los de siempre | Colores de marca |

Hay dos tokens con doble función, y por eso hay pares. `principal` es a la vez
el verde del botón (un relleno con texto blanco encima) y el de un enlace o un
borde (algo que se dibuja sobre la superficie). En el tema claro son el mismo
color; en el oscuro no pueden serlo: el relleno tiene que seguir oscuro para
sostener el texto blanco y el enlace tiene que aclararse para leerse sobre
fondo oscuro. Lo mismo pasa con `aprobado` y `rechazado`.

### Contraste medido

Calculado con la fórmula de WCAG 2.1 sobre los valores de arriba. El texto
normal pide 4,5:1; los íconos, bordes y anillos de foco, 3:1.

| Combinación en el tema oscuro | Relación |
| --- | --- |
| `texto` sobre `superficie` | 13,82:1 |
| `texto` sobre `fondo-panel` | 15,24:1 |
| `texto-suave` sobre `superficie` | 7,29:1 |
| `texto-suave` sobre `humo` | 6,39:1 |
| `principal` como texto sobre `superficie` | 8,66:1 |
| `aprobado-texto` sobre `superficie` | 9,00:1 |
| `aprobado` como texto sobre `superficie` | 7,18:1 |
| `pendiente` como texto sobre `superficie` | 8,31:1 |
| `rechazado` como texto sobre `superficie` | 6,73:1 |
| `info` como texto sobre `superficie` | 6,60:1 |
| `texto` sobre `menta` al 40 % | 10,32:1 |
| Anillo de foco (`principal`) sobre `superficie` | 8,66:1 |
| Placeholder (`gris-marca`) sobre `superficie` | 5,90:1 |
| Blanco sobre `principal-solido` | 6,09:1 |
| Blanco sobre `rechazado-solido` | 5,44:1 |
| Blanco sobre `aprobado-solido` | 4,04:1 |
| `texto-sobre-claro` sobre `acento-verde-claro` | 9,21:1 |

En el tema oscuro todo el texto llega a 4,5:1. En el claro hay siete
combinaciones que no llegan (el placeholder en `gris-marca` y `aprobado` y
`pendiente` como texto, sobre superficie, panel y su tinte); el oscuro las
resuelve porque aclara esos colores. Son anteriores al tema oscuro y siguen
pendientes (ver el punto 4 de Pendientes).

### Decisiones y límites

- **Equilibrio, no negro puro.** Las superficies son verdes muy apagados, del
  matiz del verde institucional, y suben de a poco: fondo, tarjeta, elemento
  elevado. El brillo queda para el texto y las señales (estado, foco,
  acciones).
- **El relleno del botón verde contra una superficie oscura da 2,72:1.** WCAG
  pide 3:1 para el borde de un control cuando es lo único que lo identifica.
  Acá el botón lleva texto, y es el texto el que lo identifica (6,09:1), así que
  no es una falla; pero el contorno es más tenue que en el tema claro (6,09:1).
  Al pasar el mouse, en cambio, el botón se aclara a `#4F7A6D` y sí supera los
  3:1 contra la superficie (3,42:1), con 4,84:1 contra el texto blanco. No se
  puede aclarar mucho más: pasando `#55806F` el texto blanco baja de 4,5:1.
  Subir el relleno en reposo para igualar el contorno es una decisión de
  diseño, porque deja de ser el verde de la marca.
- **Imprimir vuelve al tema claro.** Todo el bloque oscuro está dentro de
  `@media screen`. Con el oscuro, el texto saldría casi blanco sobre papel
  blanco. Vale para cualquier impresión que se haga desde el navegador.
- **El logo tiene dos archivos.** `logo-iscgb-verde.svg` sobre claro y
  `logo-iscgb.svg` (blanco hueso) sobre oscuro. Ver `public/imagenes/LEEME.md`.
- **Los controles del navegador** (barras de scroll, calendario del selector de
  fecha, listas desplegables) se dibujan oscuros por `color-scheme: dark`.
- **El autocompletado de Chrome** pinta los campos de celeste o amarillo con
  texto oscuro. Una regla `:-webkit-autofill` lo devuelve al tema.
- **El halo del foco** (`ring-offset`) se pinta del color de la superficie y
  no de blanco, para que no quede un marco blanco alrededor del botón.
- **La pantalla de arranque** de `index.html`, que se ve antes de que cargue
  Angular, tiene sus propios colores y también sigue el tema.

### Cómo probarlo

1. `npm test` y `npm run build`.
2. En el navegador, con las herramientas de desarrollo: elegir "Oscuro" en el
   selector, o emular `prefers-color-scheme: dark` con "Automático". Para
   probar como si fuera la primera visita, borrar la clave `iscgb.tema` del
   almacenamiento local.
3. Recorrer, en los dos temas: login, el panel de cada rol, Mis documentos
   (los tres estados), Configuración, un diálogo de confirmación, el
   calendario de exámenes y `/sistema-diseno`.
4. Recargar con el tema oscuro y mirar que no haya un destello claro.

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

Toda contraseña se pide con `<app-campo-contrasena>`, no con un
`<input type="password">` suelto: trae el ojito para verla u ocultarla (con
`aria-label` y `aria-pressed`) y funciona tanto con `formControlName` como con
`[valor]` y `(valorChange)`. Cuando la persona está eligiendo una contraseña
nueva va acompañada de `<app-requisitos-password>`, que muestra cada regla en
gris (todavía no se escribió), rojo con ✕ (falta) o verde con ✓ (cumplida) y una
barra de avance. El estado no depende solo del color: cada uno tiene su ícono y
un texto para el lector de pantalla. La barra mide cuánto de la política se
cumple, no qué tan segura es la contraseña.

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
- `shadow-marca-sm`, `md` y `lg`: sombras con tinte verde en vez de negro. El
  color de cada una sale de `--sombra-marca-sm|md|lg`, que cambia con el tema.

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
   que es una decisión de diseño. Para el verde ya existe `aprobado-texto`;
   falta resolver `pendiente`. En el tema oscuro los dos ya llegan a AA (7,18:1
   y 8,31:1) porque se aclaran; el problema queda solo en el claro.
5. La iconografía. El Design System define íconos para dropdowns, cards,
   requisitos y roles que todavía no están en código.
6. Si el instituto confirma la tipografía real del logo, es un cambio de una
   línea en `--font-titulo` y `--font-cuerpo`.
7. Decidir si los derivados sueltos (`principal-oscuro`, `acento-verde-claro`)
   se migran a la escala nueva (`principal-600` y demás).
8. Blanco sobre `aprobado-solido` da 4,04:1, por debajo de los 4,5:1 que pide
   AA para texto chico. Ya era así con `bg-aprobado`. Oscurecerlo un poco lo
   arregla, pero cambia el verde del botón "Aprobar" respecto del Figma.
9. Pasar `shadow-sm`, `shadow-lg` y `shadow-xl` (diálogo de confirmación, login,
   crear y recuperar contraseña) a `shadow-marca-*`, para que acompañen al tema
   oscuro. Cambia apenas el tinte de la sombra en el claro.
10. El Figma no tiene versión oscura. Conviene dibujarla a partir de la tabla de
    [Tema oscuro](#tema-oscuro) para que diseño y código no se separen.
