# ISCGB — Frontend

Interfaz web del Sistema de Gestión Documental y Autogestión Académica del
Instituto Superior Cura Gabriel Brochero.

- **Contexto funcional completo:** [`docs/ISCGB-PROJECT.md`](docs/ISCGB-PROJECT.md)
- **Convenciones para agentes de IA:** [`CLAUDE.md`](CLAUDE.md)
- **Alcance de la pantalla de login:** [`docs/alcance-login.md`](docs/alcance-login.md)
- **Contrato de la API:** [`docs/contrato-api.md`](docs/contrato-api.md)

## Stack

| Qué | Con qué |
|---|---|
| Framework | Angular 21 (standalone, zoneless) |
| Estilos | Tailwind CSS v4 |
| Formularios | Reactive Forms |
| Tests | Vitest |
| Backend | .NET 10 Web API (repo aparte) |

> Angular 21 es **zoneless por defecto**: `zone.js` ya no es una dependencia
> y no hace falta llamar a `provideZonelessChangeDetection()`.

## Arrancar

```bash
npm install
npm start
```

La aplicación queda en <http://localhost:4200>.

## Comandos

```bash
npm start        # servidor de desarrollo
npm test         # tests
npm run build    # compilar para producción
```

## Con datos falsos o contra la API real

El login funciona **sin backend**. La fuente de datos se elige en una sola
línea de [`src/app/app.config.ts`](src/app/app.config.ts):

```ts
{ provide: AuthService, useClass: AuthMockService }  // datos inventados
{ provide: AuthService, useClass: AuthHttpService }  // API real
```

Usuarios de prueba del modo simulado (todos con la contraseña `Test1234`):

| DNI | Nombre | idRol |
|---|---|---|
| `43880335` | Milena Previgliano | `1` |
| `43120234` | Angel Silva | `2` |
| `40555111` | Anahid Giaquinta | `3` |

## Cómo está organizado

```
src/app/
├── core/          Lo que existe una sola vez en toda la aplicación
│   ├── auth/          autenticación: contrato, implementaciones, modelos
│   └── configuracion/ direcciones de la API
├── shared/        Piezas reutilizables entre pantallas
│   └── ui/            componentes visuales sin lógica de negocio
└── features/      Una carpeta por área funcional
    └── auth/login/    la pantalla de inicio de sesión
```

Regla: un componente de un `feature` **nunca** se importa desde otro
`feature`. Si dos lo necesitan, se muda a `shared/`.

### Contenedor y presentacional

Cada pantalla se parte en dos tipos de componente:

- **Contenedor** — conoce los servicios, tiene el estado, decide. Uno por pantalla.
- **Presentacional** — recibe datos, emite eventos, no sabe que existe la red.

En el login: `Login` es el contenedor; `PanelBienvenida` y `FormularioLogin`
son presentacionales.

### Colores

Todos los colores viven en el bloque `@theme` de
[`src/styles.scss`](src/styles.scss). **Ningún componente escribe un
hexadecimal a mano** — se usan las clases derivadas (`bg-principal`,
`text-texto-suave`, `border-borde`, …).

## Convención de nombres de archivo

Angular 21 genera los archivos **sin** el sufijo `.component`:
`login.ts`, no `login.component.ts`. Este repo sigue esa convención por ser
la del CLI. El resto de las reglas de `CLAUDE.md` (kebab-case en archivos,
camelCase en TypeScript) se mantienen sin cambios.
