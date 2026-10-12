import { Routes } from '@angular/router';

// Écrans à construire : chaque route pointe sur le gabarit d'attente tant que la page du
// domaine n'existe pas (à créer dans `presentation/pages/`).
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const ADMINISTRATION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'utilisateurs' },
  { path: 'logo-couleurs', title: 'Logo & Couleurs', loadComponent: placeholder },
  { path: 'routage', title: 'Routage & affectation', loadComponent: placeholder },
  { path: 'agences-entites', title: 'Agences & entités', loadComponent: placeholder },
  { path: 'utilisateurs', title: 'Utilisateurs', loadComponent: placeholder },
  { path: 'journal-audit', title: "Journal d'audit", loadComponent: placeholder },
];
