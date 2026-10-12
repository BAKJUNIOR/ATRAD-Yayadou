import { Routes } from '@angular/router';

// Écrans à construire : chaque route pointe sur le gabarit d'attente tant que la page du
// domaine n'existe pas (à créer dans `presentation/pages/`).
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const AGENCE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'creer-etat' },
  { path: 'creer-etat', title: 'Créer un état', loadComponent: placeholder },
  { path: 'suivi', title: 'Suivi des dossiers', loadComponent: placeholder },
];
