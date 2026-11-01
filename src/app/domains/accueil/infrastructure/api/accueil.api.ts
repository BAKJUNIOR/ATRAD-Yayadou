import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiDossier,
  ApiDossierSuivi,
  ApiRetour,
} from '../../../dossiers/domain/entities/dossier-api.entity';

/** Entité de traitement de l'écran « Suivi & statistiques » : types rattachés et dossiers routés. */
export interface ApiEntiteSuivi {
  entiteId: string;
  code: string;
  nom: string;
  types: string[];
  /** Dossiers reçus que personne n'a encore pris en charge. */
  aDeposer: number;
  dossiers: ApiDossierSuivi[];
}

/** Réponse de `suivi.accueil` : compteurs de l'entité réceptrice et dossiers routés par entité. */
export interface ApiSuiviAccueil {
  etatsRecus: number;
  etatsAReceptionner: number;
  dossiersReceptionnes: number;
  dossiersNonRecus: number;
  nonPrisEnCharge: number;
  retoursARenvoyer: number;
  entites: ApiEntiteSuivi[];
}

/** Dossier retourné par un service traitant, en attente de renvoi à l'agence. */
export interface ApiDossierRetourne {
  dossier: ApiDossier;
  retour: ApiRetour | null;
  /** Pièces manquantes, pour un retour faute de documents. */
  piecesManquantes: string[];
}

/** Écrans de l'entité réceptrice : suivi du routage, dossiers retournés et leur renvoi à l'agence. */
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

  /** Confirme le renvoi des dossiers à leur agence d'origine. */
  renvoyer(dossierIds: readonly string[]): Observable<ApiDossier[]> {
    return this.baseService.create<ApiDossier[]>(this.url.retours.renvoi, { dossierIds });
  }
}
