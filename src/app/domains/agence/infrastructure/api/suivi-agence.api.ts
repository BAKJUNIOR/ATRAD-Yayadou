import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiDossierDetail,
  ApiDossierSuivi,
  ApiEtapeSuivi,
} from '../../../dossiers/domain/entities/dossier-api.entity';

export interface ApiSuiviAgence {
  total: number;
  compteurs: { etape: ApiEtapeSuivi; libelle: string; nombre: number }[];
  dossiers: ApiDossierSuivi[];
}

@Service()
export class SuiviAgenceApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.suivi;

  dossiers(): Observable<ApiSuiviAgence> {
    return this.baseService.getOne<ApiSuiviAgence>(this.url.agence);
  }

  dossier(id: string): Observable<ApiDossierDetail> {
    return this.baseService.getOne<ApiDossierDetail>(this.url.agenceDossier(id));
  }
}
