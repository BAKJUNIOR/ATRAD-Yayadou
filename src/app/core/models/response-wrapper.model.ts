/** Enveloppe de toutes les réponses JSON de l'API. */
export interface ResponseWrapper<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  errorCode: string | null;
  timestamp: string;
}

/** Erreur de validation sur un champ, dans `data` d'une réponse 400. */
export interface FieldError {
  champ: string;
  message: string;
}
