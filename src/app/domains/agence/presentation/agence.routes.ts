import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';

export const AGENCE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'creer-etat' },
  {
    path: 'creer-etat',
    title: 'Créer un état de transmission',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/creer-etat/creer-etat.component').then((m) => m.CreerEtatComponent),
  },
  {
    path: 'suivi',
    title: 'Suivi des dossiers',
    loadComponent: () =>
      import('./pages/suivi-dossiers/suivi-dossiers.component').then(
        (m) => m.SuiviDossiersComponent,
      ),
  },
  {
    path: 'suivi/:ref',
    title: 'Détail du dossier',
    loadComponent: () =>
      import('./pages/suivi-dossier-detail/suivi-dossier-detail.component').then(
        (m) => m.SuiviDossierDetailComponent,
      ),
  },
];
