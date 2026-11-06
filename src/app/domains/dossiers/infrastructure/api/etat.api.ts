import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiEtat } from '../../domain/entities/dossier-api.entity';

@Service()
export class EtatApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.etats;

  transmettre(typeEtatId: string | null, dossierIds: readonly string[]): Observable<ApiEtat[]> {
    return this.baseService.create<ApiEtat[]>(this.url.transmettre, { typeEtatId, dossierIds });
  }

  emis(): Observable<ApiEtat[]> {
    return this.baseService.getOne<ApiEtat[]>(this.url.emis);
  }

  recus(aReceptionner = false): Observable<ApiEtat[]> {
    return this.baseService.getOne<ApiEtat[]>(this.url.recus, { aReceptionner });
  }

  etat(id: string): Observable<ApiEtat> {
    return this.baseService.getOne<ApiEtat>(this.url.byId(id));
  }

  receptionner(id: string, dossierIds: readonly string[]): Observable<ApiEtat> {
    return this.baseService.create<ApiEtat>(this.url.reception(id), { dossierIds });
  }
}
