# Imágenes

Todo lo visual estático del sistema vive acá: logos, fotos, ilustraciones.
Se referencian desde el HTML con ruta relativa a esta carpeta:

```html
<img src="imagenes/logo-iscgb.svg" alt="" />
```

Los íconos chicos (lupa, ojo, candado) **no** van acá: se escriben como SVG
directamente en el HTML del componente. Así heredan el color del texto con
`currentColor` y no hay que pedir un archivo por cada ícono.

## Pendientes

| Archivo | Estado | De dónde sacarlo |
|---|---|---|
| `logo-iscgb.svg` | ⚠️ Provisorio | Exportar el logo oficial desde Figma |
| `instituto-aula.jpg` | ❌ Falta | Foto de fondo del panel izquierdo del login |

Mientras la foto no esté, el panel del login usa solo el degradado verde
institucional. Se ve bien igual — no bloquea nada.
