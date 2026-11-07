import { Injector, Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Account, isRole } from '../../domains/auth/domain/entities/account.entity';
import { isJwtExpired } from '../utils/jwt.util';
import { BaseService } from './base.service';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';

const SESSION_KEY = 'atrad_session_v2';
const LEGACY_KEY = 'atrad_session_v1';

interface StoredSession {
  token: string;
  account: Account;
}

@Service()
export class SessionService {
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  private remember = rememberedSession();
  private readonly current = signal<StoredSession | null>(readStoredSession());

  readonly account = computed(() => this.current()?.account ?? null);
  readonly token = computed(() => this.current()?.token ?? null);
  readonly role = computed(() => this.current()?.account.role ?? null);
  readonly isAuthenticated = computed(() => this.current() !== null);

  signIn(token: string, account: Account, remember = false): void {
    this.remember = remember;
    this.store({ token, account });
  }

  signOut(): void {
    this.store(null);
  }

  expire(): void {
    if (!this.current()) {
      return;
    }
    this.signOut();
    this.toast.warning('Votre session a expiré. Veuillez vous reconnecter.');
    void this.router.navigate(['/signin']);
  }

  private leaving = false;

  isLeaving(): boolean {
    return this.leaving;
  }

  /**
   * Après confirmation, renvoie à la page de connexion puis déconnecte. La session n'est fermée qu'une fois l'écran
   * courant quitté : il peut refuser de l'être si une saisie n'est pas enregistrée.
   */
  async signOutAndLeave(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Se déconnecter ?',
      text: `Vous allez fermer la session de ${this.current()?.account.name ?? ''}.`,
      okLabel: 'Se déconnecter',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.leaving = true;
    const left = await this.router.navigate(['/signin']);
    this.leaving = false;
    if (left) {
      this.revokeAndSignOut();
    }
  }

  revokeAndSignOut(): void {
    const token = this.token();
    this.signOut();
    if (token) {
      // BaseService est lu ici : l'injecter dans le constructeur créerait une dépendance circulaire (intercepteur).
      this.injector
        .get(BaseService)
        .create(environment.endpoints.auth.logout, null, { token, silentErrors: true })
        .subscribe({ error: () => undefined });
    }
  }

  private store(session: StoredSession | null): void {
    this.current.set(session);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      if (session) {
        (this.remember ? localStorage : sessionStorage).setItem(
          SESSION_KEY,
          JSON.stringify(session),
        );
      }
    } catch {
      // Sans sessionStorage, la session ne dure que le temps de la page.
    }
  }
}

function rememberedSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

function readStoredSession(): StoredSession | null {
  try {
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    const stored = JSON.parse(raw ?? 'null') as Partial<StoredSession> | null;
    if (
      !stored ||
      typeof stored.token !== 'string' ||
      isJwtExpired(stored.token, Date.now()) ||
      !isRole(stored.account?.role)
    ) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { token: stored.token, account: stored.account };
  } catch {
    return null;
  }
}
