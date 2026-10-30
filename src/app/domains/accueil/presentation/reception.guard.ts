import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ReceptionContext } from './reception-context.service';

/**
 * Réserve les écrans de réception à une entité réceptrice : l'agent d'accueil, ou l'agent de
 * traitement dont l'entité réceptionne aussi des états.
 */
export const receptionGuard: CanActivateFn = () =>
  inject(ReceptionContext).canReceive() || inject(Router).createUrlTree(['/']);
