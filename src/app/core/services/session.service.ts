import { Service, computed, inject, signal } from '@angular/core';
import { Account, isRole } from '../../domains/auth/domain/entities/account.entity';
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
