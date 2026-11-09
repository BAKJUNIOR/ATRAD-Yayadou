import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { receptionGuard } from './domains/accueil/presentation/reception.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Accueil',
        loadComponent: () =>
          import('./domains/home/presentation/pages/home/home.component').then(
            (m) => m.HomeComponent,
          ),
      },
      {
        path: 'profil',
        title: 'Mon profil',
        loadComponent: () =>
          import('./domains/profile/presentation/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'agence',
        canActivate: [roleGuard('agence')],
        loadChildren: () =>
          import('./domains/agence/presentation/agence.routes').then((m) => m.AGENCE_ROUTES),
      },
      {
        path: 'accueil-central',
        canActivate: [roleGuard('accueil', 'traitement'), receptionGuard],
        loadChildren: () =>
          import('./domains/accueil/presentation/accueil.routes').then((m) => m.ACCUEIL_ROUTES),
      },
      {
        path: 'traitement',
        canActivate: [roleGuard('traitement')],
        loadChildren: () =>
          import('./domains/traitement/presentation/traitement.routes').then(
            (m) => m.TRAITEMENT_ROUTES,
          ),
      },
      {
        path: 'pilotage',
        canActivate: [roleGuard('manager')],
        loadChildren: () =>
          import('./domains/pilotage/presentation/pilotage.routes').then((m) => m.PILOTAGE_ROUTES),
      },
      {
        path: 'administration',
        canActivate: [roleGuard('admin')],
        loadChildren: () =>
          import('./domains/administration/presentation/administration.routes').then(
            (m) => m.ADMINISTRATION_ROUTES,
          ),
      },
    ],
  },
  {
    path: 'signin',
    canActivate: [guestGuard],
    title: 'Connexion',
    loadComponent: () =>
      import('./domains/auth/presentation/pages/sign-in/sign-in.component').then(
        (m) => m.SignInComponent,
      ),
  },
  {
    path: 'mot-de-passe-oublie',
    canActivate: [guestGuard],
    title: 'Mot de passe oublié',
    loadComponent: () =>
      import('./domains/auth/presentation/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reinitialiser-mot-de-passe',
    canActivate: [guestGuard],
    title: 'Nouveau mot de passe',
    loadComponent: () =>
      import('./domains/auth/presentation/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: () =>
      import('./domains/errors/presentation/pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
