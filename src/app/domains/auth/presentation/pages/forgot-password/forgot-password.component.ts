import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../../core/utils/api-error.util';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { flashMessage } from '../../../../../shared/ui/flash-message';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { EMAIL_PATTERN } from '../../../domain/password.rules';
import { AuthApi } from '../../../infrastructure/api/auth.api';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink, AuthPageLayoutComponent, ButtonComponent, IconComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly error = flashMessage();
  protected readonly success = flashMessage(8000);
  protected readonly pending = signal(false);

  private readonly request = signal({ matricule: '', email: '' });
  protected readonly requestForm = form(this.request);

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending()) {
      return;
    }
    const matricule = this.request().matricule.trim();
    const email = this.request().email.trim();
    if (!matricule || !email) {
      this.error.show('Saisissez votre matricule et votre adresse e-mail professionnelle.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      this.error.show('Adresse e-mail invalide.');
      return;
    }
    this.error.clear();
    this.success.clear();
    this.pending.set(true);
    this.auth
      .forgotPassword(matricule, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          this.request.set({ matricule: '', email: '' });
          this.success.show(
            `E-mail envoyé à ${email}. Le lien est valable 15 minutes ; pensez à regarder dans les courriers indésirables.`,
          );
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.error.show(apiErrorMessage(error, 'Demande impossible. Veuillez réessayer.'));
        },
      });
  }
}
