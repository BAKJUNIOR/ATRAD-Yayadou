import { Component, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { SessionService } from '../../../../../core/services/session.service';
import { AuthPageLayoutComponent } from '../../../../../layout/auth-page-layout/auth-page-layout.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { Account } from '../../../domain/entities/account.entity';
import { AuthMock, DEMO_ACCOUNTS } from '../../../infrastructure/mock/auth.mock';

@Component({
  selector: 'app-sign-in',
  imports: [FormField, AuthPageLayoutComponent, ButtonComponent],
  templateUrl: './sign-in.component.html',
})
export class SignInComponent {
  private readonly auth = inject(AuthMock);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly demoAccounts = DEMO_ACCOUNTS;
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
    this.open(result.account);
  }

  protected open(account: Account): void {
    this.error.set('');
    this.session.signIn(account);
    void this.router.navigate(['/']);
  }
}
