# Imágenes

Todo lo visual estático del sistema vive acá: logos, fotos, ilustraciones.
Se referencian desde el HTML con ruta relativa a esta carpeta:

```html
<img src="imagenes/logo-iscgb.svg" alt="" />
```

Fijate que **no** lleva `public/` adelante: Angular publica el contenido de
esta carpeta en la raíz del sitio.

Los íconos chicos (lupa, ojo, candado) **no** van acá: se escriben como SVG
directamente en el HTML del componente. Así heredan el color del texto con
`currentColor` y no hay que pedir un archivo por cada ícono.

## Qué formato usar

| Contenido | Formato | Por qué |
|---|---|---|
| Logos, íconos, formas | **SVG** | Se dibuja con matemática: nítido a cualquier tamaño y pesa nada |
| Fotos | **JPG** o **WebP** | Están hechos para comprimir fotos |
| Imagen con transparencia | **PNG** | Es el único de los tres que la soporta |

⚠️ **PNG para una foto es un error caro.** PNG guarda píxel por píxel sin
perder nada, que es lo correcto para un logo pero un desperdicio para una
foto. La misma imagen en JPG pesa cerca de diez veces menos y se ve igual.

⚠️ **Un SVG con una foto adentro es lo peor de los dos mundos.** No escala
(la foto sigue teniendo los píxeles que tiene) y encima pesa 33% más, porque
la foto va codificada en texto. Si el contenido es una foto, exportá una foto.

## Resolución: exportá al doble

Las pantallas modernas (MacBook, iPhone) tienen el doble de píxeles reales que
los que dice el CSS. Una imagen que ocupa 800 px en pantalla necesita **1600 px**
de ancho real para verse nítida.

Regla: **medí cuánto ocupa en el diseño y exportá a 2x**.

## Inventario

| Archivo | Estado | Nota |
|---|---|---|
| `logo-iscgb.svg` | ✅ | Logo oficial, blanco (para fondos verdes) |
| `logo-iscgb-verde.svg` | ✅ | Logo oficial, verde (para fondos claros) |
| `instituto-aula.png` | ⚠️ | Funciona, pero conviene reemplazarlo — ver abajo |

### Pendiente: mejorar `instituto-aula.png`

Es la foto del panel izquierdo del login. Salió de un SVG que la tenía
embebida, así que arrastra dos problemas:

| Problema | Ahora | Debería ser |
|---|---|---|
| Formato | PNG (0.81 MB) | JPG (~80 KB) |
| Resolución | 756 × 516 | 1728 × 2234 |

En una MacBook 16" el panel mide unos 864 × 1117 px, y en pantalla retina eso
son 1728 × 2234 píxeles reales. Con 756 × 516 la foto se estira y se ve
borrosa.

**Cómo re-exportarla desde Figma:**

1. Seleccionar el frame de la foto
2. Panel derecho → sección **Export**
3. Formato: **JPG** (no SVG, no PNG)
4. Escala: **2x**
5. Export → guardar acá como `instituto-aula.jpg`
6. Cambiar la ruta en `panel-bienvenida.html` y borrar el `.png`
