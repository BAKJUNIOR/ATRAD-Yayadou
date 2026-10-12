import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/** Réserve une route aux utilisateurs connectés. */
export const authGuard: CanActivateFn = () => {
  return inject(SessionService).isAuthenticated() || inject(Router).createUrlTree(['/signin']);
};

/** Renvoie un utilisateur déjà connecté vers son accueil (page de connexion). */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  return !session.isAuthenticated() || session.isLeaving() || inject(Router).createUrlTree(['/']);
};
