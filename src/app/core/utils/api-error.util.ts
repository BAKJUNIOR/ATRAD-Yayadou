import { HttpErrorResponse } from '@angular/common/http';
import { FieldError } from '../models/response-wrapper.model';

const UNREACHABLE = 'Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez plus tard.';
const FALLBACK = 'Une erreur est survenue. Veuillez réessayer.';
/** Réponse qui ne vient pas de l'API (page du serveur web, proxy) : message selon le statut. */
const WITHOUT_API_BODY: Record<number, string> = {
  404: "Le service est introuvable à cette adresse : vérifiez que l'API est démarrée et joignable.",
  502: 'Le serveur ne répond pas. Réessayez dans un instant.',
  503: 'Le service est momentanément indisponible. Réessayez dans un instant.',
  504: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.',
};

/**
 * Erreur rendue par l'API, prête à afficher : `message` est en français, `code` est l'`errorCode` du backend
 * (`DOSSIER_INTROUVABLE`...), `status` 0 quand le serveur est injoignable.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Corps attendu : l'enveloppe `ResponseWrapper` d'erreur du backend. */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof ApiError ? error : new ApiError(0, 'ERREUR_INCONNUE', FALLBACK);
  }
  if (error.status === 0) {
    return new ApiError(0, 'SERVEUR_INJOIGNABLE', UNREACHABLE);
  }
  const body = (typeof error.error === 'object' && error.error !== null ? error.error : {}) as {
    message?: unknown;
    errorCode?: unknown;
    data?: unknown;
  };
  const fields = Array.isArray(body.data) ? (body.data as FieldError[]) : [];
  const detail = fields.length ? ` : ${fields.map((f) => f.message).join(' ; ')}` : '';
  const message =
    typeof body.message === 'string' && body.message
      ? body.message + detail
      : (WITHOUT_API_BODY[error.status] ?? FALLBACK);
  const code = typeof body.errorCode === 'string' ? body.errorCode : `HTTP_${error.status}`;
  return new ApiError(error.status, code, message, fields);
}

/** Message à afficher pour n'importe quelle erreur reçue d'un appel. */
export function apiErrorMessage(error: unknown, fallback = FALLBACK): string {
  return error instanceof ApiError ? error.message : fallback;
}
