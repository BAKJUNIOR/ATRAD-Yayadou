import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, apiErrorMessage } from '../../../../../core/utils/api-error.util';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { newPasswordError } from '../../../domain/password.rules';
import { AuthApi } from '../../../infrastructure/api/auth.api';

@Component({
  selector: 'app-reset-password',
  imports: [FormField, RouterLink, AuthPageLayoutComponent, ButtonComponent, IconComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly jeton = inject(ActivatedRoute).snapshot.queryParamMap.get('jeton') ?? '';
  protected readonly error = signal('');
  protected readonly expired = signal(!this.jeton);
  protected readonly pending = signal(false);
  protected readonly passwordShown = signal(false);

  private readonly passwords = signal({ password: '', confirmation: '' });
  protected readonly passwordForm = form(this.passwords);
  protected readonly rule = computed(() => {
    const password = this.passwords().password;
    return password ? newPasswordError(password) : '';
  });

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    const { password, confirmation } = this.passwords();
    const ruleError = newPasswordError(password);
    if (ruleError) {
      this.error.set(
        `Mot de passe trop faible : ${ruleError.charAt(0).toLowerCase()}${ruleError.slice(1)}`,
      );
      return;
    }
    if (password !== confirmation) {
      this.error.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    this.error.set('');
    this.pending.set(true);
    this.auth
      .resetPassword(this.jeton, password, confirmation)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate(['/signin'], { queryParams: { reinitialise: 1 } }),
        error: (error: unknown) => {
          this.pending.set(false);
          if (error instanceof ApiError && error.code === 'LIEN_REINITIALISATION_INVALIDE') {
            this.expired.set(true);
            return;
          }
          this.error.set(apiErrorMessage(error, 'Modification impossible. Veuillez réessayer.'));
        },
      });
  }

  protected togglePassword(): void {
    this.passwordShown.update((shown) => !shown);
  }
}
