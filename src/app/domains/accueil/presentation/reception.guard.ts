import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ReceptionContext } from './reception-context.service';

export const receptionGuard: CanActivateFn = () =>
  inject(ReceptionContext).canReceive() || inject(Router).createUrlTree(['/']);
