import { Routes } from '@angular/router';

// Écrans à construire : chaque route pointe sur le gabarit d'attente tant que la page du
// domaine n'existe pas (à créer dans `presentation/pages/`).
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const ACCUEIL_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'etats-recus' },
  { path: 'etats-recus', title: 'États reçus', loadComponent: placeholder },
  { path: 'suivi-statistiques', title: 'Suivi & statistiques', loadComponent: placeholder },
  { path: 'dossiers-retournes', title: 'Dossiers retournés', loadComponent: placeholder },
];
