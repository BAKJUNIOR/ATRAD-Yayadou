import { HttpContext, HttpContextToken } from '@angular/common/http';

export const WITHOUT_TOKEN = new HttpContextToken<boolean>(() => false);

export const TOKEN_OVERRIDE = new HttpContextToken<string | null>(() => null);

export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

export interface RequestOptions {
  withoutToken?: boolean;
  silentErrors?: boolean;
  token?: string;
}

export function contextOf(options: RequestOptions = {}): HttpContext {
  return new HttpContext()
    .set(WITHOUT_TOKEN, options.withoutToken ?? false)
    .set(SILENT_ERRORS, options.silentErrors ?? false)
    .set(TOKEN_OVERRIDE, options.token ?? null);
}
