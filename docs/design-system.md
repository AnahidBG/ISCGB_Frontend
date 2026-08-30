# Sistema de diseño ISCGB — del Figma al código

Origen: Manual de Identidad ICGB y Design System (Figma).
Implementado en `src/styles.scss` y `src/app/shared/ui/`.
Actualizado: **27/08/2026** — ver "Brochero Design System" al final.

**Muestrario en vivo:** `/sistema-diseno` — dibuja los componentes reales con
los tokens reales. Si cambia un color en `styles.scss`, esa página cambia sola.

---

## Colores

### Oficiales del manual

| Nombre | Hex | Token |
|---|---|---|
| Color principal — verde grisáceo oscuro | `#46695F` | `principal` |
| Verde claro | `#90C997` | `acento-verde` |
| Amarillo verdoso suave | `#CFD18D` | `acento-lima` |
| Verde menta | `#CBFFD1` | `menta` |
| Blanco humo | `#F5F5F5` | `humo` |
| Gris verdoso suave | `#919D99` | `gris-marca` |

### Contraste medido (WCAG 2.1)

| Combinación | Ratio | Resultado |
|---|---|---|
| Verde principal + texto blanco | 6.09:1 | ✅ AA |
| Verde claro + texto oscuro | 7.21:1 | ✅ AAA |
| Amarillo verdoso + texto oscuro | 8.63:1 | ✅ AAA |
| Verde menta + texto oscuro | 12.31:1 | ✅ AAA |
| **Verde claro + texto blanco** | 1.91:1 | ❌ **nunca usar** |
| **Gris verdoso + blanco** | 2.80:1 | ❌ **no sirve para texto** |
| Amarillo verdoso + verde principal | 3.82:1 | ⚠️ solo títulos grandes |

> 🚨 **El gris verdoso `#919D99` no alcanza para texto.** El mínimo de WCAG AA
> es 4.5:1 y da 2.80:1. Queda reservado para trazos decorativos y bordes.
> Para texto secundario y placeholders se usa `#666E6B`, que mantiene el
> mismo matiz y da 4.81:1.
>
> Esto conviene corregirlo también en el manual de identidad, no solo en el
> código: si otra persona del equipo toma el gris del manual para un texto,
> el problema vuelve.

### Derivados (no están en el manual)

Hicieron falta porque el manual define colores, pero no estados.

| Nombre | Hex | Para qué |
|---|---|---|
| `principal-oscuro` | `#35504A` | Hover y press del botón secundario |
| `acento-verde-claro` | `#B8DDB4` | Botón primario en reposo |
| `acento-verde-press` | `#7AAB80` | Botón primario presionado |
| `texto-suave` | `#666E6B` | Texto secundario accesible |
| `texto` | `#2D2D2D` | Texto principal |
| `borde` | `#E2E8E4` | Bordes de campos y divisores |

Pendiente: validar estos valores contra el Figma del Design System, que tiene
los estados dibujados.

---

## Tipografía

| Fuente | Uso | Token |
|---|---|---|
| **Gasoek One** | Títulos | `font-titulo` |
| **Geist** | Contenido | `font-cuerpo` |
| **Geist Mono** | Piezas digitales | `font-mono` |

Se cargan desde Google Fonts en `index.html` con `display=swap`, para que el
texto se lea con la fuente de respaldo mientras la definitiva descarga en vez
de quedar invisible.

> Gasoek One tiene **un solo peso**. Pedirle negrita hace que el navegador la
> falsifique estirando los trazos, y queda sucia. Por eso `.font-titulo` fija
> `font-weight: 400`.

### ⚠️ El manual y el diseño del login no coinciden

El manual dice "Gasoek One para títulos". Pero en el diseño del login, tanto
el título grande como "Bienvenido" están dibujados con la tipografía de
contenido en negrita, **no** con Gasoek One.

No es un error. Gasoek One es una display muy pesada, pensada para piezas de
comunicación. En una pantalla de sistema, donde alguien viene a hacer un
trámite, resulta ruidosa.

Por eso el código **no fuerza** `font-titulo` en todos los `h1/h2/h3`. Cada
pantalla elige y queda explícito en su HTML:

| Contexto | Tipografía |
|---|---|
| Piezas de marca y comunicación | `class="font-titulo"` → Gasoek One |
| Pantallas del sistema | por defecto → Geist en negrita |

**Pendiente:** confirmarlo con diseño y dejarlo escrito en el manual, para que
no se resuelva distinto en cada pantalla.

---

## Grilla

| | Escritorio | Celular |
|---|---|---|
| Columnas | 12 | 4 |
| Ancho de columna | 70 px | 78 px |
| Separación | 32 px | 16 px |
| Margen | 120 px | 16 px |
| **Lienzo** | **1440 px** | **392 px** |

### El lienzo de Figma no es el ancho de la pantalla

Este es el punto donde el diseño y el código dejan de ser lo mismo.

| Dispositivo | Ancho real (CSS) | Lienzo de Figma |
|---|---|---|
| MacBook 16" | 1728 px | 1440 px |
| iPhone 16 Pro Max | 440 px | 392 px |

Ninguno de los dos coincide con el lienzo. Y entre esos dos extremos hay
cientos de anchos posibles.

Por eso `.contenedor` **limita el contenido a 1440 px y lo centra**. En una
MacBook sobra aire a los costados, que es lo correcto: si el texto se
estirara a 1728 px, las líneas quedarían tan largas que el ojo se pierde al
volver al renglón siguiente. En celular el contenido estira hasta donde dé,
con 16 px de margen.

```
Figma:  UNA foto, a UN ancho.
Código: tiene que verse bien en TODOS los anchos.
```

Los quiebres se manejan con `lg:` (a partir de 1024 px), no con dos diseños
separados.

---

## Componentes

### `<app-boton>`

Tres niveles del Design System:

| Nivel | Aspecto | Cuándo |
|---|---|---|
| `primario` | Verde claro, texto oscuro, pastilla | Acción principal |
| `secundario` | Verde institucional, texto blanco | Acción de apoyo |
| `terciario` | Solo texto | Navegación, acciones menores |

```html
<app-boton nivel="primario">Iniciá tu camino</app-boton>
<app-boton nivel="secundario" href="/login">Portal de Autogestión</app-boton>
<app-boton nivel="terciario" [conFlecha]="false">Inicio</app-boton>
```

Si recibe `href` se dibuja como `<a>`; si no, como `<button>`. **No es un
detalle:** un enlace lleva a otro lado y se puede abrir en pestaña nueva; un
botón ejecuta algo acá. Confundirlos rompe la navegación por teclado.

Los estados (hover, press, focus, disabled) se resuelven con variantes de CSS,
no con JavaScript. El navegador ya sabe cuándo el mouse está encima.

> ⚠️ **Gotcha de Angular:** `<ng-content />` proyecta el contenido **una sola
> vez**, aunque se escriba en las dos ramas de un `@if`. La segunda queda
> vacía. La solución es declararlo una vez en un `<ng-template>` y usarlo con
> `ngTemplateOutlet` en ambas ramas. Está resuelto así en `boton.html`.

### `<app-encabezado>`

Navegación institucional. En escritorio los enlaces van en fila; en celular se
guardan detrás del botón de menú.

```html
<app-encabezado urlAutogestion="/login" />
```

El acceso al Portal de Autogestión va **después de Contacto**, dibujado como
botón y no como enlace de texto: los otros cuatro llevan a secciones del mismo
sitio, este lleva a entrar a un sistema.

### `<app-campo-formulario>` · `<app-pantalla-carga>`

Ver el muestrario en `/sistema-diseno`.

---

## Brochero Design System (27/08/2026)

Milena compartió un design system generado en otra sesión de Claude
("Brochero Design System.zip" + un link a un Design Canvas), a partir de
cuatro imágenes de marca (la lockup en sus tres colores y el isotipo). Se
incorporó a `styles.scss` lo que aporta de nuevo sin pisar nada confirmado.

### Lo que confirmó

Sus tres colores de marca son **exactamente** los tres colores oficiales de
acá arriba — mismo hex: `#46695F` (principal), `#CFD18D` (acento-lima),
`#919D99` (gris-marca). Dos sistemas de diseño hechos en sesiones distintas,
a partir de fuentes distintas, llegaron al mismo número. Eso es una buena
señal de que esos tres colores están bien.

### Lo que se sumó a `styles.scss`

- **Escala completa de los tres colores compartidos** (`principal-50` a
  `principal-900`, y lo mismo para `acento-lima` y `gris-marca`) — 9 tonos
  por color en vez de uno solo más un par de derivados sueltos
  (`principal-oscuro`, `acento-verde-claro`...). Son tokens nuevos y
  aditivos: no reemplazan ni tocan los que ya existían.
- **`radius-tarjeta`** (20px) y **`radius-control`** (pastilla) — con nombre
  propio, no pisan la escala de Tailwind (`rounded-lg`, etc.).
- **`shadow-marca-sm/md/lg`** — sombras con tinte verde en vez de negro
  neutro, que es como las dibuja el Brochero Design System.

### Lo que NO se tocó, y por qué

- **Tipografía.** El Brochero Design System recomienda Barlow / Barlow Semi
  Condensed / Barlow Condensed — pero lo dice como sustitución a falta de
  dato: a esa sesión solo le llegaron 4 imágenes, sin archivos de fuente
  ("no font binaries were provided"). Acá arriba, en cambio, Gasoek One y
  Geist están confirmados desde el Figma real. Adoptar Barlow habría sido
  cambiar un dato confirmado por una adivinanza de otra sesión que tenía
  menos información. Queda comentado en `styles.scss` como una línea para
  el día que se decida lo contrario.
- **`acento-verde` (#90C997) y `menta` (#CBFFD1).** El Brochero Design
  System no los tiene — su fuente (4 imágenes de marca) no incluía la
  diapositiva del manual que sí tenía estos dos colores. No se sacaron de
  `styles.scss`: son oficiales acá y no hay motivo para dudar de ellos por
  la ausencia en un sistema con menos información de partida.
- **`SiteHeader`, `SiteFooter`, `LogoLoader` y `ui_kits/sitio/`.** El
  `readme.md` del Brochero Design System dice explícitamente que se generó
  para *"una animación de carga del logo para mi página web"* — el sitio
  público institucional, no el sistema de gestión académica que es este
  repositorio. Son proyectos distintos con la misma marca. No se importó
  nada de esos componentes acá.

### Pendiente

1. Si el instituto confirma la tipografía real de la lockup (o si Milena
   decide que Barlow está bien igual), es un cambio de una línea en
   `--font-titulo` / `--font-cuerpo`.
2. Auditar `boton.ts` y el resto de `shared/ui/` para decidir si conviene
   migrar los derivados ad-hoc (`principal-oscuro`, `acento-verde-claro`...)
   a la escala nueva (`principal-600`, etc.) — no se hizo automáticamente
   para no tocar visualmente nada que ya esté funcionando sin pedirlo.

---

## Pendientes

1. **El Figma no tiene variables.** Los colores están escritos en una
   diapositiva del manual, no aplicados como variables de Figma. Mientras siga
   así, nadie puede reutilizarlos desde Figma y cada capa se pinta a mano.
   Conviene crearlas: es media hora y ordena todo.
2. **Validar los derivados** contra el Figma del Design System.
3. **Corregir el gris `#919D99`** en el manual, o aclarar ahí mismo que es
   decorativo.
4. **Iconografía**: el Design System define íconos para dropdowns, cards,
   requisitos y roles. Todavía no están en código.
