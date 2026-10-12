import { Routes } from '@angular/router';

// Écrans à construire : chaque route pointe sur le gabarit d'attente tant que la page du
// domaine n'existe pas (à créer dans `presentation/pages/`).
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const TRAITEMENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mes-dossiers' },
  { path: 'mes-dossiers', title: 'Mes dossiers', loadComponent: placeholder },
  { path: 'pool', title: 'Pool de dossiers', loadComponent: placeholder },
  { path: 'affectation', title: 'Affectation des dossiers', loadComponent: placeholder },
  { path: 'recherche', title: 'Rechercher des dossiers', loadComponent: placeholder },
  { path: 'retard-clotures', title: 'En retard & clôturés', loadComponent: placeholder },
];
