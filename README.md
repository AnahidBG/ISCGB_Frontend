# ISCGB — Frontend

Interfaz web del sistema de gestión documental y autogestión académica del
Instituto Superior Cura Gabriel Brochero. Digitaliza los legajos: cada persona
sube sus documentos en PDF, Secretaría y Dirección los revisan, y el sistema
avisa qué falta.

Hecho con Angular 21 (standalone y sin `zone.js`), Tailwind CSS v4, formularios
reactivos y Vitest. El backend es una Web API en .NET 10 y vive en otro
repositorio.

## Arrancar

```bash
npm install
npm start
```

Queda en <http://localhost:4200> y necesita el backend corriendo en
<http://localhost:5231>. Esa dirección está en
[`src/app/core/configuracion/api.ts`](src/app/core/configuracion/api.ts) y en
ningún otro lado.

Los otros dos comandos:

```bash
npm test         # tests con Vitest
npm run build    # compilación de producción
```

## Trabajar sin backend

Cada servicio de `core/` habla con la API real, y varios tienen además una
versión con datos inventados. Cuál se usa se decide en
[`src/app/app.config.ts`](src/app/app.config.ts), cambiando una línea:

```ts
{ provide: AuthService, useClass: AuthHttpService }  // API real, así viene
{ provide: AuthService, useClass: AuthMockService }  // datos inventados
```

Con el login simulado se entra con cualquiera de estos DNI y la contraseña
`Test1234`:

- `11111111` Docente
- `22222222` Alumno
- `33333333` Director
- `44444444` Secretario
- `55555555` Director y Docente a la vez
- `66666666` sin ningún rol

Son inventados a propósito. Nunca cargues un DNI real en el repo.

## Cómo está organizado

```text
src/app/
├── core/        servicios por dominio, guards, interceptores y las URLs de la API
├── shared/ui/   componentes reutilizables: botón, insignia de estado, estructura del panel
└── features/    las pantallas, agrupadas por rol y por trámite
```

Tres reglas sostienen esa estructura.

Un componente de un feature no se importa desde otro feature. Si dos lo
necesitan, se muda a `shared/`.

Cada pantalla tiene un componente contenedor, que conoce los servicios y maneja
el estado, y componentes presentacionales en `partes/`, que solo reciben datos
y emiten eventos. En el login, `Login` es el contenedor y `FormularioLogin` y
`PanelBienvenida` son presentacionales.

Ningún componente escribe un color hexadecimal. Los colores están en el bloque
`@theme` de [`src/styles.scss`](src/styles.scss) y se usan por su clase:
`bg-principal`, `text-texto-suave`, `border-borde`.

Los archivos van en kebab-case y sin el sufijo `.component`: `login.ts`, no
`login.component.ts`. Es lo que genera el CLI de Angular 21.

## Documentación

- [`docs/ISCGB-PROJECT.md`](docs/ISCGB-PROJECT.md): alcance, roles y sprints.
- [`docs/como-probar.md`](docs/como-probar.md): cómo levantar todo y probarlo
  paso a paso.
- [`docs/contrato-api.md`](docs/contrato-api.md): los endpoints tal como están
  hoy.
- [`docs/alineacion-sprint-2.md`](docs/alineacion-sprint-2.md): qué está hecho
  y qué le falta al backend.
- [`docs/patrones-frontend.md`](docs/patrones-frontend.md): los patrones de
  diseño que el código ya usa.
- [`docs/design-system.md`](docs/design-system.md): colores, tipografía y
  componentes.
- [`docs/guia-pantalla-nueva.md`](docs/guia-pantalla-nueva.md): qué revisar
  antes de armar una pantalla.
- [`CLAUDE.md`](CLAUDE.md): convenciones para quien trabaje con un agente de IA.
