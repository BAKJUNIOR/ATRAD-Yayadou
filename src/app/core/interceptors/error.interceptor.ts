import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';
import { ToastService } from '../services/toast.service';
import { toApiError } from '../utils/api-error.util';
import { SILENT_ERRORS, WITHOUT_TOKEN } from './http-context';

/**
 * Traduit toute erreur HTTP en `ApiError` (message français et `errorCode` du backend), l'affiche en toast sauf
 * pour un appel `silentErrors`, et ferme la session quand le jeton n'est plus accepté (401).
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const toast = inject(ToastService);
  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError = toApiError(error);
      if (apiError.status === 401 && !request.context.get(WITHOUT_TOKEN)) {
        session.expire();
      } else if (!request.context.get(SILENT_ERRORS)) {
        toast.error(apiError.message);
      }
      return throwError(() => apiError);
    }),
  );
};
