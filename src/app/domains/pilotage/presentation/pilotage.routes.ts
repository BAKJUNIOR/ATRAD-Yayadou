import { Routes } from '@angular/router';

export const PILOTAGE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
  {
    path: 'tableau-de-bord',
    title: 'Tableau de bord',
    loadComponent: () =>
      import('./pages/tableau-de-bord/tableau-de-bord.component').then(
        (m) => m.TableauDeBordComponent,
      ),
  },
  {
    path: 'delais',
    title: 'Respect des délais',
    loadComponent: () => import('./pages/delais/delais.component').then((m) => m.DelaisComponent),
  },
  {
    path: 'agences',
    title: 'Vue par agence',
    loadComponent: () =>
      import('./pages/agences/agences.component').then((m) => m.AgencesComponent),
  },
  {
    path: 'rapports',
    title: 'Rapports',
    loadComponent: () =>
      import('./pages/rapports/rapports.component').then((m) => m.RapportsComponent),
  },
];
