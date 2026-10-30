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

## Référentiel et jeux de données

- **Jeux de données** (`domains/dossiers/domain/datasets.ts`) : `interne`, `neutre`, `entreprise`. Chacun définit entités, types d'état, types de dossier, champs et libellés du formulaire, équipes et comptes de démonstration. Le jeu est choisi dans « Réinitialiser les données de démo » (clé `atrad_dataset_v1`) et appliqué au rechargement ; à défaut : `neutre` si des données existent, sinon `interne`.
- **Référentiel** (`domain/referentiel.ts`, store `ReferentielStore`, clé `atrad_referentiel_v1`) : entités et leurs capacités (`emet`, `recep`, `trait`), types d'état (une entité réceptrice, des entités émettrices), circuit de chaque type de dossier (type d'état + entité de traitement), mode de saisie (`choix` / `auto`) et vocabulaire. Fonctions pures lisant un paramétrage de module, comme `routing.ts`.
- Une entité est désignée par son code (`AG-014`) ; son libellé `Nom (CODE)` est stocké sur les dossiers et remis à jour par `TransmissionStore.normalizeEntities()` après un renommage.
- `DOSSIER_TYPES`, `PRODUITS` et `ENTITES` sont des listes mises à jour sur place ; les champs d'un type se lisent avec `fieldsOf()`, ses pièces avec `piecesOf()`. Ne plus écrire « Accueil central » : lire `etatInfo(etat)` (type d'état et réceptrice).
- **Vocabulaire** : `VocabularyService` réécrit tout le texte affiché (« Client » → libellé du tiers, « Dossier », « agence » → « entité émettrice ») avec `applyVocabulary()` ; une zone `data-novocab` est épargnée.
- Une entité privée de la capacité de son profil ne voit que l'accueil (`ROLE_CAPABILITY`).

## Parcours agence (premiers écrans construits)

- `domains/dossiers/` est le socle partagé par tous les profils : entités `Dossier` / `Etat`, catalogue des types et de leurs champs (`dossier-catalog.ts`), routage par défaut (`routing.ts`), bordereau imprimable.
- Créer un état : choix du type d'état (seuls ses types de dossier sont proposés) ou, en mode `auto`, un état généré par type d'état à la validation (`draftGroups()`). `TransmissionStore.transmit()` renvoie les états produits.
- `TransmissionStore` (`domains/dossiers/infrastructure/store/`) tient lieu de backend : dossiers et états sont conservés dans le `localStorage` (clé `atrad_live_data_v1`), le contenu des pièces jointes dans IndexedDB. Chaque méthode correspond à un futur appel d'API.
- Les règles métier sont des fonctions pures dans `domains/<domaine>/domain/` (ex. `dossier-form.rules.ts`, `suivi.ts`), testées sans composant.
- Un écran riche expose son état par une façade fournie par la page (`creer-etat.facade.ts`), partagée par ses composants.
- Dates : stockées en ISO 8601, mises en forme à l'affichage avec `core/utils/date.util.ts`.
- Dialogues : hôte `dialog-card`, en-tête `<app-dialog-head [title] [kind]>` (pastille `danger` / `warning` / `success` / `info`, bouton de fermeture), boutons `dialog-cancel` / `dialog-confirm` dans `dialog-actions`.
- Couleur des icônes d'action : suppression en rouge (`text-danger`), modification en bleu (`text-info`), consultation en couleur de marque, validation en vert.
- Confirmation : `ConfirmService.ask(...)` (dialogue CDK). Saisie non enregistrée : la page implémente `canLeave()` et sa route déclare `unsavedChangesGuard`.
- Classes utilitaires de formulaire dans `styles.css` : `form-control`, `form-label`, `form-error`, `panel`, `eyebrow`, `icon-button` ; champ complet avec `<app-form-field>`.

## Parcours accueil

- Réception : `TransmissionStore.receive()` pointe les dossiers reçus d'un état par son entité réceptrice, les dispatche vers leur entité de traitement (`RoutedDossier`) — ou les prend en charge directement quand la réceptrice les traite (`direct`) — et les affecte selon le mode de l'entité (tour de rôle, pool ou répartiteur). Elle est refusée à une autre entité et pour un type sans entité de traitement. Les dossiers non pointés passent « Non reçu » et restent pointables.
- `ReceptionContext` : entité réceptrice de l'utilisateur (agent d'accueil, ou agent de traitement dont l'entité réceptionne) et ses seuls états/dossiers. `receptionGuard` ouvre `accueil-central` à ce second cas, dont le menu se divise en « Réception » et « Traitement ».
- Écrans : `etats-recus` (recherche, état conservé dans `EtatSearchState`), `etats-recus/:ref` (pointage), `suivi-statistiques`, `dossiers-retournes`. Leurs règles sont dans `domains/accueil/domain/reception.ts`.
- Menu latéral : chaque entrée de `navigation.ts` porte le glyphe du prototype (`icon`), et non une icône SVG.
- Détail d'un dossier côté agence : l'encart « motif du retour / documents attendus » vient de `returnNotice()` (`domains/agence/domain/suivi.ts`).
- Pastilles du menu : `NavBadgesService` ; notifications par profil : `NotificationsService`.
- Tableaux du prototype : `<table class="grid-table">` avec un modificateur de colonnes par ligne (`etats-grid`, `pointage-grid`, ...) défini dans `styles.css`.
- Fidélité au prototype : avant d'écrire un écran, le rendre dans le prototype HTML et en reprendre la mise en page et les styles à l'identique.

## Parcours traitement

- Circuits de statuts et actions autorisées : `domains/dossiers/domain/workflow.ts` (`nextStatuses`, `DossierAction`). `TransmissionStore.applyAction()` refuse toute transition hors circuit.
- Droits d'un agent dans son entité : `functionsOf()` et `ENTITY_SETTINGS` (`routing.ts`). Le menu (`requires` dans `navigation.ts`) et les routes (`functionGuard`) en dépendent.
- `TraitementContext` porte l'entité, le membre incarné (« Voir en tant que », démonstration) et son portefeuille. `DossierActionsService` ouvre le dialogue d'une action puis l'applique.
- Écrans : `mes-dossiers`, `recherche`, `retard-clotures` (même composant, portée donnée par la route), `dossiers/:ref`, `affectation`. Délais et filtres : `domains/traitement/domain/portfolio.ts`.
- Menus contextuels : `@angular/cdk/menu` avec la classe `menu-item`.

## Parcours pilotage et date de démonstration

- Indicateurs : fonctions pures de `domains/pilotage/domain/indicators.ts` (respect des délais, périodes, classements), affichées par `tableau-de-bord`, `delais`, `agences`, `rapports`.
- `DemoClock` (`core/services`) décale la date du jour (« Avancer la date de démo ») pour faire apparaître les retards. Toute date du jour passe par `core/utils/date.util.ts` (`nowIso`, `todayIsoDate`, `isoDateInDays`) ou par `clock.today()` dans un `computed` : ne pas appeler `new Date()` directement.
- « Réinitialiser les données de démo » vide `TransmissionStore`, les pièces jointes et la date de démonstration.

## Parcours administration et marque blanche

- Écrans : `logo-couleurs`, `routage` (circuit des types de dossier, répartition interne), `entites`, `types-etat` (et mode de saisie), `vocabulaire`, `journal-audit` ; « Utilisateurs » reste sur le gabarit d'attente.
- Routage : le circuit de chaque type de dossier est dans le référentiel ; `RoutingStore` (clé `atrad_routing_v1`) ne garde que la répartition interne, par code d'entité. Un changement ne s'applique qu'aux réceptions suivantes. Pool partagé : écran `traitement/pool`, `TransmissionStore.take()`.
- Marque blanche : `BrandService` (`core/services`, clé `atrad_brand_v1`) pose les variables `--brand-*` sur `<html>`, charge la police, remplace le favicon et fournit nom, organisation et logos. Ne jamais écrire « ATRAD » ou « YAYADOU » en dur dans un écran : lire `BrandService`.
- Modèle, palettes et dérivation des couleurs : `core/branding/brand.ts` et `core/utils/color.util.ts`. L'aperçu de l'écran applique le brouillon sur le seul bloc `.brand-preview` (`styles.css`).
- Mode sombre par défaut de la marque : suivi par `ThemeService` tant que l'utilisateur n'a pas choisi lui-même (`followBrandDefault`, `clearChoice`).
- « Réinitialiser les données de démo » (dialogue avec choix du jeu de données) efface aussi le référentiel, le routage, la marque et le choix de thème, puis recharge l'application.

## Profil de l'utilisateur

- Page `/profil` (`domains/profile/`), ouverte depuis le menu du profil de l'en-tête et accessible à tous les rôles : identité, rattachement, sécurité, apparence.
- Seules les coordonnées (e-mail, téléphone) sont modifiables ; elles sont conservées par identifiant dans `ProfileStore` (clé `atrad_profile_v1`). Le nom ne l'est pas : il sert à rattacher dossiers et affectations.
- Règles de saisie : `domains/profile/domain/profile.rules.ts`. Le changement de mot de passe valide la saisie mais n'enregistre rien tant que l'API d'authentification n'est pas branchée.
