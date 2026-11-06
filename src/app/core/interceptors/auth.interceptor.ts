import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TOKEN_OVERRIDE, WITHOUT_TOKEN } from './http-context';
import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = request.context.get(TOKEN_OVERRIDE) ?? inject(SessionService).token();
  if (!token || request.context.get(WITHOUT_TOKEN)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
