import { Routes } from '@angular/router';

export const ACCUEIL_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'etats-recus' },
  {
    path: 'etats-recus',
    title: 'États de transmission reçus',
    loadComponent: () =>
      import('./pages/etats-recus/etats-recus.component').then((m) => m.EtatsRecusComponent),
  },
  {
    path: 'etats-recus/:ref',
    title: "Détail de l'état de transmission",
    loadComponent: () =>
      import('./pages/etat-detail/etat-detail.component').then((m) => m.EtatDetailComponent),
  },
  {
    path: 'suivi-statistiques',
    title: 'Suivi & statistiques',
    loadComponent: () =>
      import('./pages/suivi-statistiques/suivi-statistiques.component').then(
        (m) => m.SuiviStatistiquesComponent,
      ),
  },
  {
    path: 'dossiers-retournes',
    title: 'Dossiers retournés',
    loadComponent: () =>
      import('./pages/dossiers-retournes/dossiers-retournes.component').then(
        (m) => m.DossiersRetournesComponent,
      ),
  },
];
