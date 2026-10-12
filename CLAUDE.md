You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Architecture du projet

Même découpage que le back-office ATHL (`core` / `domains` / `layout` / `shared`), écrit avec les conventions ci-dessus (signals, `inject()`, `input()`).

```
src/app/
├── core/                  # Transverse, sans UI
│   ├── guards/            # authGuard, guestGuard, roleGuard(...roles)
│   ├── navigation/        # NAVIGATION : menu de chaque profil
│   └── services/          # theme, sidebar, session, storage, toast, page-title.strategy
├── domains/<domaine>/     # Un dossier par domaine métier
│   ├── domain/entities/   # Types métier
│   ├── infrastructure/    # mock/ aujourd'hui, api/ au branchement du backend
│   └── presentation/      # <domaine>.routes.ts, pages/, components/
├── layout/                # app-layout, app-sidebar, app-header, backdrop, auth-page-layout
└── shared/
    ├── models/            # Types partagés entre domaines (statuts)
    └── ui/                # Primitives : button, icon, status-badge, stat-card, theme-toggle, ...
```

- **Profils** : `agence`, `accueil`, `traitement`, `manager`, `admin`. Chaque profil a son menu (`core/navigation/navigation.ts`) et ses routes, protégées par `roleGuard`.
- **Nouvel écran** : créer la page dans `domains/<domaine>/presentation/pages/`, puis remplacer `placeholder` par son `loadComponent` dans `<domaine>.routes.ts`. Le `title` d'une route ne contient que le nom de l'écran.
- **Données** : aucune consommation d'API pour l'instant. Les données fictives vivent dans `infrastructure/mock/` ; `provideHttpClient` n'est pas encore déclaré.
- **Nommage des fichiers** : suffixes explicites (`*.component.ts`, `*.service.ts`, `*.guard.ts`), configurés dans `angular.json`.

## Thème et styles

- Tailwind CSS v4, configuré uniquement dans `src/styles.css` (pas de `tailwind.config.js`).
- Les couleurs sont des variables CSS (`--brand-*`, `--bg-*`, `--text-*`, `--status-*`) exposées en utilitaires par `@theme inline` : `bg-card`, `bg-soft`, `text-ink`, `text-ink-muted`, `border-line`, `bg-brand`, `text-brand-ink`, `bg-navy`, `text-success`, etc.
- **Mode sombre** : `ThemeService` pose la classe `dark` et `data-theme` sur `<html>` (clé `atrad_theme_v1`). Les utilitaires ci-dessus suivent le thème tout seuls : ne pas écrire de variante `dark:` pour une couleur du thème, et ne pas coder de couleur hexadécimale dans un template.
- **Statuts** : `<app-status-badge [status]="…" />`, la liste est dans `shared/models/status.ts`.
- Polices : Geist (texte) et Geist Mono (références, dates).

## Bibliothèques

`@angular/cdk`, `apexcharts` + `ng-apexcharts` (graphiques), `flatpickr` (dates). Ne pas ajouter de dépendance sans demander.
