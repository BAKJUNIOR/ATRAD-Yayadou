import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../../domains/auth/domain/entities/account.entity';
import { SessionService } from '../services/session.service';

export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const role = inject(SessionService).role();
    return (role !== null && allowed.includes(role)) || inject(Router).createUrlTree(['/']);
  };
}
