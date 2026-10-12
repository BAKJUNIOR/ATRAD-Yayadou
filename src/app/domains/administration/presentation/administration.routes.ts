import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';

// Écrans à construire : la route pointe sur le gabarit d'attente tant que la page n'existe pas.
const placeholder = () =>
  import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
    (m) => m.ScreenPlaceholderComponent,
  );

export const ADMINISTRATION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'routage' },
  {
    path: 'logo-couleurs',
    title: 'Logo & Couleurs',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/logo-couleurs/logo-couleurs.component').then((m) => m.LogoCouleursComponent),
  },
  {
    path: 'routage',
    title: "Paramétrage du routage et de l'affectation",
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/routage/routage.component').then((m) => m.RoutageComponent),
  },
  // Non construits dans le prototype (« prévu à une étape suivante »).
  { path: 'agences-entites', title: 'Agences & entités', loadComponent: placeholder },
  { path: 'utilisateurs', title: 'Utilisateurs', loadComponent: placeholder },
  {
    path: 'journal-audit',
    title: "Journal d'audit",
    loadComponent: () =>
      import('./pages/journal-audit/journal-audit.component').then((m) => m.JournalAuditComponent),
  },
];
