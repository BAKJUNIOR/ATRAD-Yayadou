import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiEtat } from '../../domain/entities/dossier-api.entity';

/** États de transmission : envoi du brouillon, états émis et reçus, détail (bordereau) et pointage de réception. */
@Service()
export class EtatApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.etats;

  /** `typeEtatId` : obligatoire en mode « choix du type d'état », ignoré en mode automatique. */
  transmettre(typeEtatId: string | null, dossierIds: readonly string[]): Observable<ApiEtat[]> {
    return this.baseService.create<ApiEtat[]>(this.url.transmettre, { typeEtatId, dossierIds });
  }

  emis(): Observable<ApiEtat[]> {
    return this.baseService.getOne<ApiEtat[]>(this.url.emis);
  }

  /** `aReceptionner` : seulement les états qui ont encore des dossiers à pointer. */
  recus(aReceptionner = false): Observable<ApiEtat[]> {
    return this.baseService.getOne<ApiEtat[]>(this.url.recus, { aReceptionner });
  }

  etat(id: string): Observable<ApiEtat> {
    return this.baseService.getOne<ApiEtat>(this.url.byId(id));
  }

  /** Pointe les dossiers reçus ; ceux de l'état non cochés passent « non reçus ». */
  receptionner(id: string, dossierIds: readonly string[]): Observable<ApiEtat> {
    return this.baseService.create<ApiEtat>(this.url.reception(id), { dossierIds });
  }
}
