import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';
import { MemberFunction } from '../../dossiers/domain/routing';
import { TraitementContext } from './traitement-context.service';

/** Réserve un écran aux membres ayant une fonction donnée dans leur entité. */
function functionGuard(required: MemberFunction): CanActivateFn {
  return () =>
    inject(TraitementContext).functions()[required] || inject(Router).createUrlTree(['/']);
}

const list = () =>
  import('./pages/dossiers-list/dossiers-list.component').then((m) => m.DossiersListComponent);

export const TRAITEMENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mes-dossiers' },
  {
    path: 'mes-dossiers',
    title: 'Mes dossiers',
    data: { mode: 'mine' },
    loadComponent: list,
  },
  {
    path: 'recherche',
    title: 'Rechercher des dossiers',
    canActivate: [functionGuard('rechercher')],
    data: { mode: 'all' },
    loadComponent: list,
  },
  {
    path: 'retard-clotures',
    title: 'Dossiers en retard & clôturés',
    data: { mode: 'late' },
    loadComponent: list,
  },
  {
    path: 'affectation',
    title: 'Affectation des dossiers',
    canActivate: [functionGuard('affecter')],
    loadComponent: () =>
      import('./pages/affectation/affectation.component').then((m) => m.AffectationComponent),
  },
  {
    // Aucune entité n'est en mode pool par défaut : l'écran sera construit avec le paramétrage
    // du routage par l'administrateur.
    path: 'pool',
    title: 'Pool de dossiers',
    canActivate: [functionGuard('pool')],
    loadComponent: () =>
      import('../../../shared/ui/screen-placeholder/screen-placeholder.component').then(
        (m) => m.ScreenPlaceholderComponent,
      ),
  },
  {
    path: 'dossiers/:ref',
    title: 'Détail du dossier',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/dossier-detail/dossier-detail.component').then(
        (m) => m.DossierDetailComponent,
      ),
  },
];
