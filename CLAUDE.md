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

- **Profils** : `agence` (entité émettrice), `accueil` (entité réceptrice), `traitement`, `manager`, `admin`. Chaque profil a son menu (`core/navigation/navigation.ts`) et ses routes, protégées par `roleGuard`. Le profil `manager` n'est plus proposé à la connexion (prototype du 24/10) ; ses écrans restent en place.
- **Nouvel écran** : créer la page dans `domains/<domaine>/presentation/pages/`, puis remplacer `placeholder` par son `loadComponent` dans `<domaine>.routes.ts`. Le `title` d'une route ne contient que le nom de l'écran.
- **Données** : branchement de l'API en cours, domaine par domaine (les écrans pas encore branchés lisent toujours leurs stores locaux). Même organisation que xbanking-Backoffice :
  - Environnements (`src/environments/`) : `environment.ts` (local), `environment.demo.ts` (`--configuration demo`), `environment.prod.ts` ; chacun porte `baseUrl` et `endpoints`. Les chemins sont écrits une seule fois dans `endpoints.ts` (un chemin à identifiant est une fonction) ; le code lit `environment.endpoints.<domaine>`.
  - `AppConfigService` : `public/config/app-config.json` (`apiBaseUrl`, réécrit au déploiement) l'emporte sur `environment.baseUrl` ; vide = même origine que le front.
  - `BaseService` (`core/services/`) : méthodes d'appel communes (`getOne`, `create`, `update`, `delete`, `upload`, `getBlob`, `url`), réponses rendues sans l'enveloppe `ResponseWrapper` (`core/models/`). Options d'un appel : `withoutToken` (public, un 401 n'y ferme pas la session), `silentErrors` (l'écran affiche l'erreur), `token` (jeton explicite).
  - Intercepteurs (`core/interceptors/`) : jeton de la session ; toute erreur devient une `ApiError` (`core/utils/api-error.util.ts` : message français, `code` = `errorCode` du backend), affichée en toast ; un 401 ferme la session.
  - Pas de DTO : les données de l'API sont typées par les entités du domaine (`domain/entities/*.entity.ts`), qui portent aussi leur conversion (`accountFromUtilisateur`, `brandFromMarque`). Les appels sont dans `infrastructure/api/<domaine>.api.ts`, avec `BaseService` et `environment.endpoints`.
  - En local, `ng serve` relaie `/api` et `/ws` vers `http://localhost:8080` (`proxy.conf.json`).
- **Session** : jeton et compte (`/auth/login` puis `/moi`) dans le sessionStorage (`atrad_session_v2`), ou dans le localStorage avec « Se souvenir de moi » (identifiant aussi gardé, `atrad_identifiant_v1`) ; un jeton expiré n'est jamais repris.
- **Nommage des fichiers** : suffixes explicites (`*.component.ts`, `*.service.ts`, `*.guard.ts`), configurés dans `angular.json`.

## Thème et styles

- Tailwind CSS v4, configuré uniquement dans `src/styles.css` (pas de `tailwind.config.js`).
- Les couleurs sont des variables CSS (`--brand-*`, `--bg-*`, `--text-*`, `--status-*`) exposées en utilitaires par `@theme inline` : `bg-card`, `bg-soft`, `text-ink`, `text-ink-muted`, `border-line`, `bg-brand`, `text-brand-ink`, `bg-navy`, `text-success`, etc.
- **Mode sombre** : `ThemeService` pose la classe `dark` et `data-theme` sur `<html>` (clé `atrad_theme_v1`). Les utilitaires ci-dessus suivent le thème tout seuls : ne pas écrire de variante `dark:` pour une couleur du thème, et ne pas coder de couleur hexadécimale dans un template.
- **Statuts** : `<app-status-badge [status]="…" />`, la liste est dans `shared/models/status.ts`.
- Polices : Geist (texte) et Geist Mono (références, dates).

## Bibliothèques

`@angular/cdk`, `apexcharts` + `ng-apexcharts` (graphiques), `flatpickr` (dates). Ne pas ajouter de dépendance sans demander.

## Référentiel

- **Référentiel** (`domain/referentiel.ts`, store `ReferentielStore`) : lu dans l'API après la connexion (`refresh()`), gardé dans le navigateur (`atrad_referentiel_v1`) pour s'afficher aussitôt au rechargement. Il contient les entités (avec leur `id`), les types d'état, les types de dossier et leur circuit, le mode de saisie (`choix` / `auto`), les champs, pièces et produits de chaque type (formulaire de l'API), les motifs de retour et les circuits de statuts (`workflows`). Conversion : `referentielFromApi()` (`domain/entities/referentiel.entity.ts`).
- Le front désigne une entité par son code (`AG-014`, libellé `Nom (CODE)`) et un type de dossier par son nom ; les UUID de l'API sont gardés à côté (`entite.id`, `typeIds`) pour les appels.
- `fieldsOf()`, `piecesOf()`, `produitsOf()` lisent le formulaire de l'API (à défaut, le jeu de données). Les jeux de données (`datasets.ts`) ne fournissent plus que les libellés du formulaire de saisie.
- `nextStatuses()` et `actionCodeTo()` (`workflow.ts`) suivent le circuit de statuts du backend.
- **Vocabulaire** : réglé dans « Logo & Couleurs » avec la marque (`Brand.vocab`) ; `VocabularyService` réécrit tout le texte affiché, une zone `data-novocab` est épargnée.

## Données des dossiers

- Conversions API → front dans `domains/dossiers/domain/entities/dossier-api.entity.ts` : `dossierFromApi`, `etatFromApi`, `routedFromApi` (détail : historique réel, documents attendus, retour), `brouillonOf` (corps envoyé), `statusOf` / `statusCodeOf` (codes de statut ↔ libellés), `agencyStatusOf`.
- Appels communs : `DossierApi` (brouillon, pièces jointes) et `EtatApi` (transmission, états émis et reçus, détail, pointage).
- Pièces jointes : choisies en mémoire (`PieceJointe.file`), envoyées à l'API avec le dossier ; ouvertes par `PieceOpener` (fichier en mémoire ou téléchargé par l'API).
- Bordereau : `BordereauService.open(etatId)`, l'aperçu relit l'état dans l'API.

## Parcours

- **Agence** : `BrouillonStore` (`domains/agence/infrastructure/store/`) tient le brouillon, les états émis et transmet ; suivi des dossiers et fiche par `SuiviAgenceApi` (`/suivi/agence`). Routes de détail par identifiant (`/agence/suivi/:id`).
- **Accueil** : `ReceptionStore` (états reçus et leurs dossiers, pointage, compteurs) ; « Suivi & statistiques » et « Dossiers retournés » par `AccueilApi`. `ReceptionContext` : entité réceptrice de l'utilisateur.
- **Traitement** : `TraitementStore` (répartition de l'entité, droits, mes dossiers, pool, bac, recherche, fiche, actions) ; `TraitementContext` expose entité, équipe, droits et portefeuilles ; les gardes des écrans attendent les droits (`ready()`). Fiche par identifiant (`/traitement/dossiers/:id`) ; seul le gestionnaire en charge reçoit des actions. Commentaires internes masqués (pas d'API).
- **Pilotage** : indicateurs calculés par l'API (`PilotageApi`), mis en forme par les fonctions `*FromApi` de `domain/indicators.ts`.
- **Notifications** : `NotificationsService` (cloche) lit l'API et reçoit les nouvelles notifications en temps réel par WebSocket (`core/realtime/stomp-client.ts`, client STOMP sans dépendance, file `/user/queue/notifications`).
- **Données à l'ouverture de session** : `AppLayoutComponent` charge celles du profil connecté (pastilles du menu, accueil).
- Date du jour : `Clock` (`core/services/clock.service.ts`) et `core/utils/date.util.ts` ; ne pas appeler `new Date()` directement.

## Administration et marque blanche

- Écrans : `utilisateurs` (recherche paginée, création, modification, activation), `logo-couleurs` (marque, logos et vocabulaire), `routage` (circuits des types de dossier, répartition interne via `RoutingStore`), `entites`, `types-etat` (et mode de saisie), `journal-audit` (vide en attendant le module audit du backend). Appels : `AdministrationApi`, `UtilisateurApi`.
- Marque blanche : `BrandService` lit la marque dans l'API au démarrage, l'enregistre (`save(brand, files)`) et la réinitialise ; elle pose les variables `--brand-*`, charge la police, remplace le favicon. Ne jamais écrire « ATRAD » ou « YAYADOU » en dur dans un écran : lire `BrandService`.
- Modèle, palettes et dérivation des couleurs : `core/branding/brand.ts` et `core/utils/color.util.ts` ; conversion API dans `core/branding/marque.entity.ts`.

## Profil de l'utilisateur

- Page `/profil` (`domains/profile/`), accessible à tous les rôles : compte lu dans l'API (`ProfileApi`, `/moi`), coordonnées et mot de passe enregistrés par l'API (les erreurs du serveur s'affichent dans le dialogue).
