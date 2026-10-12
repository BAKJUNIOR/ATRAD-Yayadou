import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Account, isRole } from '../../domains/auth/domain/entities/account.entity';
import { ConfirmService } from './confirm.service';
import { StorageService } from './storage.service';

const SESSION_KEY = 'atrad_session_v1';

/**
 * Utilisateur connecté.
 * Tant que l'API n'est pas branchée, le compte est conservé tel quel dans le localStorage ;
 * il sera remplacé par un jeton émis par le backend.
 */
@Service()
export class SessionService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  private readonly current = signal<Account | null>(this.readStoredAccount());

  readonly account = this.current.asReadonly();
  readonly role = computed(() => this.current()?.role ?? null);
  readonly isAuthenticated = computed(() => this.current() !== null);

  signIn(account: Account): void {
    this.current.set(account);
    this.storage.set(SESSION_KEY, account);
  }

  signOut(): void {
    this.current.set(null);
    this.storage.remove(SESSION_KEY);
  }

  /** Vrai pendant la sortie vers la page de connexion (voir `guestGuard`). */
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
      text: `Vous allez quitter la session de ${this.current()?.name ?? ''}. Les données de démo restent enregistrées sur ce poste.`,
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
      this.signOut();
    }
  }

  private readStoredAccount(): Account | null {
    const stored = this.storage.get<Partial<Account>>(SESSION_KEY);
    if (!stored || !isRole(stored.role) || typeof stored.name !== 'string') {
      return null;
    }
    return {
      role: stored.role,
      name: stored.name,
      ident: stored.ident ?? '',
      roleLabel: stored.roleLabel ?? '',
      entity: stored.entity ?? '',
    };
  }
}
