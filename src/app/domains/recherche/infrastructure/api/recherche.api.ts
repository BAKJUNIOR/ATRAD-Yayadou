import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PaginationResponse } from '../../../../core/models/pagination.model';
import { BaseService } from '../../../../core/services/base.service';
import { AttestationTrouvee, CritereRecherche, EtatTrouve } from '../../domain/recherche';

@Service()
export class RechercheApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.recherche;

  etats(
    critere: CritereRecherche,
    valeur: string,
    page: number,
    taille: number,
  ): Observable<PaginationResponse<EtatTrouve>> {
    return this.baseService.getOne(this.url.etats, { critere, valeur, page, taille });
  }

  attestations(
    critere: CritereRecherche,
    valeur: string,
    page: number,
    taille: number,
  ): Observable<PaginationResponse<AttestationTrouvee>> {
    return this.baseService.getOne(this.url.attestations, { critere, valeur, page, taille });
  }
}
