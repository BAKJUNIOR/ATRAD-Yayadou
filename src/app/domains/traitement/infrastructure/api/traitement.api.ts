import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiDossier, ApiDossierDetail } from '../../../dossiers/domain/entities/dossier-api.entity';

export type ApiModeRepartition = 'AUTOMATIQUE' | 'POOL' | 'REPARTITEUR';

export interface ApiMembre {
  utilisateurId: string;
  matricule: string;
  nom: string;
  prenom: string;
  repartiteur: boolean;
  droitRecherche: boolean;
  droits: string[];
}

export interface ApiRepartition {
  entiteId: string;
  entiteCode: string;
  mode: ApiModeRepartition;
  membres: ApiMembre[];
}

@Service()
export class TraitementApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.traitement;
  private readonly repartitionUrl = environment.endpoints.repartition;

  repartition(entiteId: string): Observable<ApiRepartition> {
    return this.baseService.getOne<ApiRepartition>(this.repartitionUrl.byEntite(entiteId));
  }

  mesDossiers(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.url.mesDossiers);
  }

  pool(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.url.pool);
  }

  bac(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.url.bac);
  }

  recherche(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.url.recherche);
  }

  dossier(id: string): Observable<ApiDossierDetail> {
    return this.baseService.getOne<ApiDossierDetail>(this.url.dossier(id));
  }

  prendre(id: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.prendre(id));
  }

  affecter(id: string, gestionnaireId: string, commentaire?: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.affecter(id), {
      gestionnaireId,
      commentaire,
    });
  }

  agir(id: string, actionCode: string, commentaire?: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.actions(id), { actionCode, commentaire });
  }

  demanderDocuments(id: string, pieces: readonly string[], note: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.demandeDocuments(id), { pieces, note });
  }

  retourner(id: string, motifIds: readonly string[], commentaire: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.retour(id), { motifIds, commentaire });
  }
}
