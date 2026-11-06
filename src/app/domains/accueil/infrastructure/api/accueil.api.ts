import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiDossier,
  ApiDossierSuivi,
  ApiRetour,
} from '../../../dossiers/domain/entities/dossier-api.entity';

export interface ApiEntiteSuivi {
  entiteId: string;
  code: string;
  nom: string;
  types: string[];
  aDeposer: number;
  dossiers: ApiDossierSuivi[];
}

export interface ApiSuiviAccueil {
  etatsRecus: number;
  etatsAReceptionner: number;
  dossiersReceptionnes: number;
  dossiersNonRecus: number;
  nonPrisEnCharge: number;
  retoursARenvoyer: number;
  entites: ApiEntiteSuivi[];
}

export interface ApiDossierRetourne {
  dossier: ApiDossier;
  retour: ApiRetour | null;
  piecesManquantes: string[];
}

@Service()
export class AccueilApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints;

  suivi(): Observable<ApiSuiviAccueil> {
    return this.baseService.getOne<ApiSuiviAccueil>(this.url.suivi.accueil);
  }

  retours(): Observable<ApiDossierRetourne[]> {
    return this.baseService.getOne<ApiDossierRetourne[]>(this.url.retours.base);
  }

  renvoyer(dossierIds: readonly string[]): Observable<ApiDossier[]> {
    return this.baseService.create<ApiDossier[]>(this.url.retours.renvoi, { dossierIds });
  }
}
