import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiDossierDetail, ApiDossierSuivi, ApiEtapeSuivi } from '../../../dossiers/domain/entities/dossier-api.entity';

/** Réponse de `suivi.agence` : compteurs par étape et dossiers de l'agence, du plus récent au plus ancien. */
export interface ApiSuiviAgence {
  total: number;
  compteurs: { etape: ApiEtapeSuivi; libelle: string; nombre: number }[];
  dossiers: ApiDossierSuivi[];
}

/** Écran « Suivi des dossiers » de l'agence et fiche d'un dossier transmis. */
@Service()
export class SuiviAgenceApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.suivi;

  dossiers(): Observable<ApiSuiviAgence> {
    return this.baseService.getOne<ApiSuiviAgence>(this.url.agence);
  }

  /** Fiche en lecture seule : pièces demandées, retour, pièces jointes et historique. */
  dossier(id: string): Observable<ApiDossierDetail> {
    return this.baseService.getOne<ApiDossierDetail>(this.url.agenceDossier(id));
  }
}
