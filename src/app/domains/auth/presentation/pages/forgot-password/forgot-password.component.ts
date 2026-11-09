import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../../../core/utils/api-error.util';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
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

  protected readonly error = signal('');
  protected readonly pending = signal(false);
  protected readonly sent = signal(false);

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
      this.error.set('Saisissez votre matricule et votre adresse e-mail professionnelle.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      this.error.set('Adresse e-mail invalide.');
      return;
    }
    this.error.set('');
    this.pending.set(true);
    this.auth
      .forgotPassword(matricule, email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          this.sent.set(true);
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.error.set(apiErrorMessage(error, 'Demande impossible. Veuillez réessayer.'));
        },
      });
  }
}
