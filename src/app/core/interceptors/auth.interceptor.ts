import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TOKEN_OVERRIDE, WITHOUT_TOKEN } from './http-context';
import { SessionService } from '../services/session.service';

/** Ajoute le jeton de la session aux appels de l'API, sauf à ceux marqués `withoutToken` ; `token` en option
 * remplace celui de la session. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = request.context.get(TOKEN_OVERRIDE) ?? inject(SessionService).token();
  if (!token || request.context.get(WITHOUT_TOKEN)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
