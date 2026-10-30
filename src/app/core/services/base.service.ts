import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestOptions, contextOf } from '../interceptors/http-context';
import { ResponseWrapper } from '../models/response-wrapper.model';
import { AppConfigService } from './app-config.service';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Méthodes d'appel communes à toutes les API des domaines. `endPoint` vient de `environment.endpoints` ; l'adresse
 * du serveur est ajoutée ici. Les réponses JSON sont rendues sans leur enveloppe `ResponseWrapper` (`data` seul).
 * Le jeton et la traduction des erreurs sont faits par les intercepteurs.
 */
@Service()
export class BaseService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  getOne<T>(endPoint: string, params?: QueryParams, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.get<ResponseWrapper<T>>(this.url(endPoint), {
        params: toParams(params),
        context: contextOf(options),
      }),
    );
  }

  create<T>(endPoint: string, data?: unknown, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.post<ResponseWrapper<T>>(this.url(endPoint), data ?? null, { context: contextOf(options) }),
    );
  }

  update<T>(endPoint: string, data?: unknown, options?: RequestOptions): Observable<T> {
    return this.unwrap(
      this.http.put<ResponseWrapper<T>>(this.url(endPoint), data ?? null, { context: contextOf(options) }),
    );
  }

  delete<T>(endPoint: string, options?: RequestOptions): Observable<T> {
    return this.unwrap(this.http.delete<ResponseWrapper<T>>(this.url(endPoint), { context: contextOf(options) }));
  }

  /** Envoi d'un fichier en multipart, dans le champ `fichier` attendu par le backend. */
  upload<T>(method: 'POST' | 'PUT', endPoint: string, file: File, options?: RequestOptions): Observable<T> {
    const body = new FormData();
    body.append('fichier', file, file.name);
    return this.unwrap(
      this.http.request<ResponseWrapper<T>>(method, this.url(endPoint), { body, context: contextOf(options) }),
    );
  }

  /** Fichier binaire (pièce jointe, export) : pas d'enveloppe JSON. */
  getBlob(endPoint: string, options?: RequestOptions): Observable<Blob> {
    return this.http.get(this.url(endPoint), { responseType: 'blob', context: contextOf(options) });
  }

  /** Adresse complète d'un chemin d'API, y compris un chemin renvoyé par le serveur (`/api/v1/...`). */
  url(endPoint: string): string {
    return `${this.config.apiBaseUrl}/${endPoint.replace(/^\/+/, '')}`;
  }

  private unwrap<T>(response: Observable<ResponseWrapper<T>>): Observable<T> {
    return response.pipe(map((wrapper) => wrapper.data));
  }
}

function toParams(params?: QueryParams): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      result = result.set(key, String(value));
    }
  }
  return result;
}
