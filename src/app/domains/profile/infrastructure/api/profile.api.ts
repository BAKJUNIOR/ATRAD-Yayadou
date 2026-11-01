import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { Utilisateur } from '../../../auth/domain/entities/utilisateur.entity';

/** Écran « Mon profil » : le compte connecté, ses coordonnées et son mot de passe. */
@Service()
export class ProfileApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.moi;

  moi(): Observable<Utilisateur> {
    return this.baseService.getOne<Utilisateur>(this.url.base);
  }

  modifierCoordonnees(email: string, telephone: string): Observable<Utilisateur> {
    return this.baseService.update<Utilisateur>(this.url.coordonnees, { email, telephone });
  }

  /** Les erreurs (mot de passe actuel faux...) restent dans le dialogue de saisie. */
  changerMotDePasse(
    motDePasseActuel: string,
    nouveauMotDePasse: string,
    confirmation: string,
  ): Observable<void> {
    return this.baseService.update<void>(
      this.url.motDePasse,
      { motDePasseActuel, nouveauMotDePasse, confirmation },
      { silentErrors: true },
    );
  }
}
