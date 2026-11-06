import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = () => {
  return inject(SessionService).isAuthenticated() || inject(Router).createUrlTree(['/signin']);
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  return !session.isAuthenticated() || session.isLeaving() || inject(Router).createUrlTree(['/']);
};
