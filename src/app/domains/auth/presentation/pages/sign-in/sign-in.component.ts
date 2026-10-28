import { Component, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { SessionService } from '../../../../../core/services/session.service';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { Account } from '../../../domain/entities/account.entity';
import { AuthMock, demoAccounts } from '../../../infrastructure/mock/auth.mock';

/** Mot de passe prérempli des comptes de démonstration (la connexion simulée accepte tout). */
const DEMO_PASSWORD = 'demo1234';

@Component({
  selector: 'app-sign-in',
  imports: [FormField, AuthPageLayoutComponent, ButtonComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {
  private readonly auth = inject(AuthMock);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly demoAccounts = demoAccounts();
  protected readonly error = signal('');

  private readonly credentials = signal({ ident: '', password: '' });
  protected readonly signInForm = form(this.credentials);

  protected submit(event: Event): void {
    event.preventDefault();
    const { ident, password } = this.credentials();
    const result = this.auth.authenticate(ident, password);
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    this.error.set('');
    this.session.signIn(result.account);
    void this.router.navigate(['/']);
  }

  /** Préremplit le formulaire : la connexion se fait ensuite avec « Se connecter ». */
  protected fill(account: Account): void {
    this.error.set('');
    this.credentials.set({ ident: account.ident, password: DEMO_PASSWORD });
  }

  protected isSelected(account: Account): boolean {
    return this.credentials().ident === account.ident;
  }
}
