import { Service, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import { ApiError } from '../../../../core/utils/api-error.util';
import { LoginResponse } from '../../domain/entities/auth-session.entity';
import { Utilisateur } from '../../domain/entities/utilisateur.entity';
import { Account, accountFromUtilisateur } from '../../domain/entities/account.entity';

export interface SignedIn {
  token: string;
  account: Account;
}

/** Connexion à l'API. Les erreurs restent à l'écran de connexion (pas de toast). */
@Service()
export class AuthApi {
  private readonly baseService = inject(BaseService);
  private readonly authEndpoints = environment.endpoints.auth;
  private readonly moiEndpoints = environment.endpoints.moi;

  /** Obtient le jeton, puis lit le compte avec ce jeton : la session n'est ouverte qu'avec un compte complet. */
  signIn(identifiant: string, motDePasse: string): Observable<SignedIn> {
    return this.baseService
      .create<LoginResponse>(
        this.authEndpoints.login,
        { identifiant, motDePasse },
        { withoutToken: true, silentErrors: true },
      )
      .pipe(
        switchMap(({ accessToken }) =>
          this.baseService
            .getOne<Utilisateur>(this.moiEndpoints.base, undefined, { token: accessToken, silentErrors: true })
            .pipe(map((utilisateur) => ({ token: accessToken, account: accountOf(utilisateur) }))),
        ),
      );
  }
}

function accountOf(utilisateur: Utilisateur): Account {
  const account = accountFromUtilisateur(utilisateur);
  if (!account) {
    throw new ApiError(403, 'PROFIL_INCONNU', "Ce compte n'a aucun profil utilisable dans l'application.");
  }
  return account;
}
