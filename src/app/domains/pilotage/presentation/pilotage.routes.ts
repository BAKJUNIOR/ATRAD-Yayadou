import { Routes } from '@angular/router';

// Écrans à construire : chaque route pointe sur le gabarit d'attente tant que la page du
// domaine n'existe pas (à créer dans `presentation/pages/`).
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const PILOTAGE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
  { path: 'tableau-de-bord', title: 'Tableau de bord', loadComponent: placeholder },
  { path: 'delais', title: 'Respect des délais', loadComponent: placeholder },
  { path: 'agences', title: 'Vue par agence', loadComponent: placeholder },
  { path: 'rapports', title: 'Rapports', loadComponent: placeholder },
];
