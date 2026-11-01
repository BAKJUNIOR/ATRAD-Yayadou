import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiDossier, ApiDossierDetail } from '../../../dossiers/domain/entities/dossier-api.entity';

export type ApiModeRepartition = 'AUTOMATIQUE' | 'POOL' | 'REPARTITEUR';

/** Membre de l'équipe d'une entité de traitement ; `droits` : Traiter, S'attribuer, Affecter, Rechercher. */
export interface ApiMembre {
  utilisateurId: string;
  matricule: string;
  nom: string;
  prenom: string;
  repartiteur: boolean;
  droitRecherche: boolean;
  droits: string[];
}

/** Répartition interne d'une entité de traitement : mode d'attribution et équipe. */
export interface ApiRepartition {
  entiteId: string;
  entiteCode: string;
  mode: ApiModeRepartition;
  membres: ApiMembre[];
}

/** Parcours traitement : portefeuilles, fiche d'un dossier et actions de l'équipe. */
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

  /** Tous les dossiers de l'entité (droit « Rechercher »). */
  recherche(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.url.recherche);
  }

  /** Fiche : actions possibles (pour le gestionnaire en charge), documents attendus, retour, pièces, historique. */
  dossier(id: string): Observable<ApiDossierDetail> {
    return this.baseService.getOne<ApiDossierDetail>(this.url.dossier(id));
  }

  prendre(id: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.prendre(id));
  }

  /** Attribution depuis le bac ou réaffectation, par un répartiteur. */
  affecter(id: string, gestionnaireId: string, commentaire?: string): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.url.affecter(id), {
      gestionnaireId,
      commentaire,
    });
  }

  /** Passage du circuit par son code (VALIDER, CLOTURER...) ; `commentaire` sert de motif s'il est exigé. */
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
