import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiEntite,
  ApiTypeDossier,
  ApiTypeEtat,
} from '../../../dossiers/domain/entities/referentiel.entity';
import {
  ApiModeRepartition,
  ApiRepartition,
} from '../../../traitement/infrastructure/api/traitement.api';

/** Corps de création ou de modification d'une entité ; le code ne change plus après la création. */
export interface ApiEntiteRequest {
  code: string;
  nom: string;
  nature: string;
  parentId: string | null;
  peutEmettre: boolean;
  peutReceptionner: boolean;
  peutTraiter: boolean;
  responsableId: string | null;
  adjointId: string | null;
  email: string | null;
  emailCopieRejet: string | null;
  ville: string | null;
  delaiTransitJours: number | null;
  modeRepartition: ApiModeRepartition;
  actif: boolean | null;
}

/** Type d'état : une entité réceptrice et les entités émettrices autorisées. */
export interface ApiTypeEtatRequest {
  nom: string;
  entiteReceptriceId: string;
  emettriceIds: string[];
}

/** Répartition interne d'une entité : mode et équipe, avec le rôle de répartiteur et le droit de recherche. */
export interface ApiRepartitionRequest {
  mode: ApiModeRepartition;
  membres: { utilisateurId: string; repartiteur: boolean; droitRecherche: boolean }[];
}

/** Paramétrage de l'administrateur : entités, types d'état, types de dossier et répartition interne. */
@Service()
export class AdministrationApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints;

  entite(id: string): Observable<ApiEntite & ApiEntiteRequest> {
    return this.baseService.getOne<ApiEntite & ApiEntiteRequest>(this.url.entites.byId(id));
  }

  creerEntite(entite: ApiEntiteRequest): Observable<ApiEntite> {
    return this.baseService.create<ApiEntite>(this.url.entites.base, entite);
  }

  modifierEntite(id: string, entite: ApiEntiteRequest): Observable<ApiEntite> {
    return this.baseService.update<ApiEntite>(this.url.entites.byId(id), entite);
  }

  creerTypeEtat(type: ApiTypeEtatRequest): Observable<ApiTypeEtat> {
    return this.baseService.create<ApiTypeEtat>(this.url.typesEtat.base, type);
  }

  modifierTypeEtat(id: string, type: ApiTypeEtatRequest): Observable<ApiTypeEtat> {
    return this.baseService.update<ApiTypeEtat>(this.url.typesEtat.byId(id), type);
  }

  modifierModeSaisie(mode: 'CHOIX' | 'AUTO'): Observable<{ mode: 'CHOIX' | 'AUTO' }> {
    return this.baseService.update<{ mode: 'CHOIX' | 'AUTO' }>(this.url.typesEtat.modeSaisie, {
      mode,
    });
  }

  /** Nouveau type de dossier rattaché à un type d'état ; sans entité de traitement, la réceptrice le traite. */
  creerTypeDossier(
    nom: string,
    typeEtatId: string,
    entiteTraitementId: string | null,
  ): Observable<ApiTypeDossier> {
    return this.baseService.create<ApiTypeDossier>(this.url.typesDossier.base, {
      nom,
      typeEtatId,
      entiteTraitementId,
    });
  }

  modifierCircuit(
    id: string,
    typeEtatId: string,
    entiteTraitementId: string | null,
  ): Observable<ApiTypeDossier> {
    return this.baseService.update<ApiTypeDossier>(this.url.typesDossier.circuit(id), {
      typeEtatId,
      entiteTraitementId,
    });
  }

  supprimerTypeDossier(id: string): Observable<void> {
    return this.baseService.delete<void>(this.url.typesDossier.byId(id));
  }

  repartition(entiteId: string): Observable<ApiRepartition> {
    return this.baseService.getOne<ApiRepartition>(this.url.repartition.byEntite(entiteId));
  }

  modifierRepartition(
    entiteId: string,
    repartition: ApiRepartitionRequest,
  ): Observable<ApiRepartition> {
    return this.baseService.update<ApiRepartition>(
      this.url.repartition.byEntite(entiteId),
      repartition,
    );
  }
}
