import { Service, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiEntite,
  ApiFormulaire,
  ApiMotif,
  ApiTypeDossier,
  ApiTypeEtat,
  ReferentielApiPart,
  referentielFromApi,
} from '../../domain/entities/referentiel.entity';

/**
 * Paramétrage lu dans l'API pour le référentiel : entités, types d'état, types de dossier et leurs formulaires,
 * mode de saisie. Lecture seule, ouverte à tout utilisateur connecté.
 */
@Service()
export class ReferentielApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints;

  referentiel(): Observable<ReferentielApiPart> {
    return forkJoin({
      entites: this.baseService.getOne<ApiEntite[]>(this.url.entites.base),
      typesEtat: this.baseService.getOne<ApiTypeEtat[]>(this.url.typesEtat.base),
      typesDossier: this.baseService.getOne<ApiTypeDossier[]>(this.url.typesDossier.base),
      motifsRetour: this.baseService.getOne<ApiMotif[]>(this.url.motifs.base, { categorie: 'RETOUR' }),
      modeSaisie: this.baseService
        .getOne<{ mode: 'CHOIX' | 'AUTO' }>(this.url.typesEtat.modeSaisie)
        .pipe(map(({ mode }) => mode)),
    }).pipe(
      switchMap((parametrage) =>
        this.formulaires(parametrage.typesDossier).pipe(
          map((formulaires) => referentielFromApi({ ...parametrage, formulaires })),
        ),
      ),
    );
  }

  private formulaires(types: ApiTypeDossier[]): Observable<ApiFormulaire[]> {
    const actifs = types.filter((type) => type.actif);
    return actifs.length
      ? forkJoin(
          actifs.map((type) =>
            this.baseService.getOne<ApiFormulaire>(this.url.typesDossier.formulaire(type.id)),
          ),
        )
      : of([]);
  }
}
