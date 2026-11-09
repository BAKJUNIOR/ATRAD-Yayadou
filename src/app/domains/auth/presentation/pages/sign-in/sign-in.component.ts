import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../../../core/services/session.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.util';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { flashMessage } from '../../../../../shared/ui/flash-message';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import { AuthApi } from '../../../infrastructure/api/auth.api';

const REMEMBERED_IDENT_KEY = 'atrad_identifiant_v1';

@Component({
  selector: 'app-sign-in',
  imports: [FormField, RouterLink, AuthPageLayoutComponent, ButtonComponent, IconComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {
  private readonly auth = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly referentiel = inject(ReferentielStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly reset = flashMessage(6000);
  protected readonly error = flashMessage();
  protected readonly pending = signal(false);
  protected readonly passwordShown = signal(false);

  constructor() {
    if (inject(ActivatedRoute).snapshot.queryParamMap.has('reinitialise')) {
      this.reset.show('Mot de passe modifié : connectez-vous avec le nouveau.');
    }
  }

  private readonly credentials = signal({ ...rememberedIdent(), password: '' });
  protected readonly signInForm = form(this.credentials);

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    const ident = this.credentials().ident.trim();
    const { password, remember } = this.credentials();
    if (!ident || !password) {
      this.error.show('Saisissez votre matricule et votre mot de passe.');
      return;
    }
    this.error.clear();
    this.pending.set(true);
    this.auth
      .signIn(ident, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ token, account }) => {
          this.session.signIn(token, account, remember);
          rememberIdent(remember ? ident : null);
          // Les écrans lisent le référentiel : il est chargé avant d'afficher l'accueil.
          void this.referentiel.refresh().then(() => this.router.navigate(['/']));
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.error.show(apiErrorMessage(error, 'Connexion impossible. Veuillez réessayer.'));
        },
      });
  }

  protected togglePassword(): void {
    this.passwordShown.update((shown) => !shown);
  }
}

function rememberedIdent(): { ident: string; remember: boolean } {
  try {
    const ident = localStorage.getItem(REMEMBERED_IDENT_KEY);
    return { ident: ident ?? '', remember: ident !== null };
  } catch {
    return { ident: '', remember: false };
  }
}

function rememberIdent(ident: string | null): void {
  try {
    if (ident) {
      localStorage.setItem(REMEMBERED_IDENT_KEY, ident);
    } else {
      localStorage.removeItem(REMEMBERED_IDENT_KEY);
    }
  } catch {
    // Préférence non gardée si le stockage est indisponible.
  }
}
