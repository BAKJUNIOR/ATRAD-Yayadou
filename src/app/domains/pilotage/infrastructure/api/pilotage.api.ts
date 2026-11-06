import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';

export interface FiltrePilotage {
  agenceId?: string;
  typeDossierId?: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface ApiIndicateur {
  code: string;
  libelle: string;
  nombre: number;
  pourcentage: number;
}

export interface ApiAgenceIndicateurs {
  agenceId: string;
  code: string;
  nom: string;
  total: number;
  enCours: number;
  enRetard: number;
  tauxRetard: number;
  respectDelais: number | null;
  delaiMoyenJours: number | null;
}

export interface ApiTableauDeBord {
  total: number;
  termines: number;
  enCours: number;
  enRetard: number;
  nonRecus: number;
  etatsRecusPartiellement: number;
  respectDelais: number | null;
  terminesDansLesDelais: number;
  delaiMoyenJours: number | null;
  parStatut: ApiIndicateur[];
  parType: ApiIndicateur[];
  parAgence: ApiAgenceIndicateurs[];
}

export interface ApiDossierEnRetard {
  dossierId: string;
  reference: string;
  client: string;
  agence: string;
  typeDossier: string;
  statut: string;
  echeance: string;
  joursDeRetard: number;
}

export interface ApiRespectDelais {
  respectDelais: number | null;
  enRetard: number;
  total: number;
  termines: number;
  terminesDansLesDelais: number;
  retards: ApiDossierEnRetard[];
  classementAgences: ApiAgenceIndicateurs[];
}

@Service()
export class PilotageApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.pilotage;

  tableauDeBord(filtre: FiltrePilotage = {}): Observable<ApiTableauDeBord> {
    return this.baseService.getOne<ApiTableauDeBord>(this.url.tableauDeBord, { ...filtre });
  }

  delais(filtre: FiltrePilotage = {}): Observable<ApiRespectDelais> {
    return this.baseService.getOne<ApiRespectDelais>(this.url.delais, { ...filtre });
  }

  agences(filtre: FiltrePilotage = {}): Observable<ApiAgenceIndicateurs[]> {
    return this.baseService.getOne<ApiAgenceIndicateurs[]>(this.url.agences, { ...filtre });
  }
}
