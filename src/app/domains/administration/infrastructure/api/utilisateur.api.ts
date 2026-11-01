import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PaginationResponse } from '../../../../core/models/pagination.model';
import { BaseService } from '../../../../core/services/base.service';
import { Utilisateur } from '../../../auth/domain/entities/utilisateur.entity';

/** Critères de recherche des utilisateurs ; `page` commence à 0. */
export interface RechercheUtilisateurs {
  recherche?: string;
  entiteId?: string;
  profil?: string;
  page?: number;
  taille?: number;
}

export interface ApiUtilisateurCreation {
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  motDePasse: string;
  entiteId: string | null;
  fonctionId: string | null;
  profils: string[];
}

export interface ApiUtilisateurModification {
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
}

/** Profil (rôle) attribuable à un utilisateur : AGENCE, ACCUEIL, TRAITEMENT, MANAGER, ADMIN. */
export interface ApiProfil {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  actif: boolean;
}

/** Fonction d'un utilisateur dans son entité (gestionnaire, agent...). */
export interface ApiFonction {
  id: string;
  code: string;
  libelle: string;
  actif: boolean;
}

/** Gestion des utilisateurs (administrateur). */
@Service()
export class UtilisateurApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.utilisateurs;
  private readonly references = environment.endpoints.referentielOrganisation;

  rechercher(criteres: RechercheUtilisateurs = {}): Observable<PaginationResponse<Utilisateur>> {
    return this.baseService.getOne<PaginationResponse<Utilisateur>>(this.url.base, { ...criteres });
  }

  /** Création et modifications : les erreurs restent dans le dialogue de saisie (pas de toast). */
  creer(utilisateur: ApiUtilisateurCreation): Observable<Utilisateur> {
    return this.baseService.create<Utilisateur>(this.url.base, utilisateur, { silentErrors: true });
  }

  modifier(id: string, utilisateur: ApiUtilisateurModification): Observable<Utilisateur> {
    return this.baseService.update<Utilisateur>(this.url.byId(id), utilisateur, {
      silentErrors: true,
    });
  }

  modifierProfils(id: string, profils: readonly string[]): Observable<Utilisateur> {
    return this.baseService.update<Utilisateur>(
      this.url.profils(id),
      { profils },
      { silentErrors: true },
    );
  }

  modifierStatut(id: string, actif: boolean): Observable<Utilisateur> {
    return this.baseService.update<Utilisateur>(this.url.statut(id), { actif });
  }

  changerEntite(id: string, entiteId: string, fonctionId: string | null): Observable<Utilisateur> {
    return this.baseService.update<Utilisateur>(
      this.url.affectation(id),
      { entiteId, fonctionId },
      { silentErrors: true },
    );
  }

  profils(): Observable<ApiProfil[]> {
    return this.baseService.getOne<ApiProfil[]>(this.references.profils);
  }

  fonctions(): Observable<ApiFonction[]> {
    return this.baseService.getOne<ApiFonction[]>(this.references.fonctions);
  }
}
