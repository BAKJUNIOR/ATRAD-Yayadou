import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PaginationResponse } from '../../../../core/models/pagination.model';
import { BaseService } from '../../../../core/services/base.service';

/** Notification de l'utilisateur ; `objetType` / `objetId` : ce qu'elle ouvre au clic (DOSSIER ou ETAT). */
export interface ApiNotification {
  id: string;
  utilisateurId: string;
  type: string;
  niveau: 'INFO' | 'WARN' | 'DANGER';
  titre: string;
  message: string | null;
  objetType: 'DOSSIER' | 'ETAT' | null;
  objetId: string | null;
  lu: boolean;
  luLe: string | null;
  creeLe: string;
}

/**
 * Message temps réel de la file `/user/queue/notifications` : nouvelle notification, notification lue, ou tout lu
 * (`notification` absente), avec le nombre de non-lues calculé par le serveur.
 */
export interface EvenementNotification {
  type: 'notification:new' | 'notification:read' | 'notification:read-all';
  notification: ApiNotification | null;
  nonLues: number;
}

/** Cloche des notifications de l'utilisateur connecté. */
@Service()
export class NotificationApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.notifications;

  liste(page = 0, taille = 30): Observable<PaginationResponse<ApiNotification>> {
    return this.baseService.getOne<PaginationResponse<ApiNotification>>(this.url.base, {
      page,
      taille,
    });
  }

  nonLues(): Observable<{ nonLues: number }> {
    return this.baseService.getOne<{ nonLues: number }>(this.url.nonLues);
  }

  marquerLue(id: string): Observable<ApiNotification> {
    return this.baseService.update<ApiNotification>(this.url.lue(id));
  }

  toutesLues(): Observable<{ nonLues: number }> {
    return this.baseService.update<{ nonLues: number }>(this.url.toutesLues);
  }
}
