# Imágenes

Acá va todo lo visual estático del sistema: logos, fotos e ilustraciones. Se
referencian con la ruta relativa a esta carpeta, sin `public/` adelante, porque
Angular publica su contenido en la raíz del sitio:

```html
<img src="imagenes/logo-iscgb.svg" alt="" />
```

Los íconos chicos (lupa, ojo, candado) no van acá. Se escriben como SVG en el
HTML del componente: así heredan el color del texto con `currentColor` y no hay
que pedir un archivo por cada uno.

## Qué formato usar

- Logos, íconos y formas: SVG. Se ve nítido a cualquier tamaño y casi no pesa.
- Fotos: JPG o WebP.
- Imágenes con transparencia: PNG.

Una foto en PNG pesa cerca de diez veces más que en JPG y se ve igual. PNG
guarda píxel por píxel, que sirve para un logo y es un desperdicio para una
foto.

Tampoco metas una foto adentro de un SVG. No escala, porque la foto sigue
teniendo los píxeles que tiene, y pesa un 33% más por ir codificada como texto.

## Resolución

Las pantallas modernas tienen el doble de píxeles reales que los que dice el
CSS. Una imagen que ocupa 800 px necesita 1600 px de ancho para verse nítida.
Medí cuánto ocupa en el diseño y exportá a 2x.

## Qué hay hoy

- `logo-iscgb.svg`: logo oficial en blanco, para fondos verdes.
- `logo-iscgb-verde.svg`: logo oficial en verde, para fondos claros.
- `instituto-aula.png`: la foto del panel izquierdo del login. Funciona, pero
  hay que reemplazarla.

### Pendiente: reemplazar `instituto-aula.png`

Salió de un SVG que la tenía embebida y arrastra dos problemas: es un PNG de
0,81 MB cuando debería ser un JPG de unos 80 KB, y mide 756 × 516 cuando
debería medir 1728 × 2234.

En una MacBook de 16" el panel mide unos 864 × 1117 px, que en pantalla retina
son 1728 × 2234 píxeles reales. Con la resolución actual la foto se estira y se
ve borrosa.

Para exportarla de nuevo desde Figma:

1. Seleccionar el frame de la foto.
2. En el panel derecho, sección Export, elegir formato JPG y escala 2x.
3. Guardarla acá como `instituto-aula.jpg`.
4. Cambiar la ruta en `panel-bienvenida.html` y borrar el `.png`.
