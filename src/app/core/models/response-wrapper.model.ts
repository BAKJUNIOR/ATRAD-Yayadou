export interface ResponseWrapper<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  errorCode: string | null;
  timestamp: string;
}

export interface FieldError {
  champ: string;
  message: string;
}
