import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Account, isRole } from '../../domains/auth/domain/entities/account.entity';
import { demoAccounts } from '../../domains/auth/infrastructure/mock/auth.mock';
import { entiteOf, normalizeEntity } from '../../domains/dossiers/domain/referentiel';
import { ReferentielStore } from '../../domains/dossiers/infrastructure/store/referentiel.store';
import { ConfirmService } from './confirm.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

const SESSION_KEY = 'atrad_session_v1';

/**
 * Utilisateur connecté.
 * Tant que l'API n'est pas branchée, le compte est conservé tel quel dans le localStorage, et
 * dans le sessionStorage pour qu'un onglet garde son propre profil ; il sera remplacé par un
 * jeton émis par le backend.
 */
@Service()
export class SessionService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  // Le référentiel (jeu de données, entités) doit être en place pour valider le compte enregistré.
  private readonly referentiel = inject(ReferentielStore);

  private readonly current = signal<Account | null>(this.readStoredAccount());

  readonly account = this.current.asReadonly();
  readonly role = computed(() => this.current()?.role ?? null);
  readonly isAuthenticated = computed(() => this.current() !== null);

  signIn(account: Account): void {
    this.current.set(account);
    this.storage.set(SESSION_KEY, account);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(account));
    } catch {
      // Sans sessionStorage, tous les onglets partagent le profil du localStorage.
    }
  }

  signOut(): void {
    this.current.set(null);
    this.storage.remove(SESSION_KEY);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Rien à nettoyer.
    }
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
    const stored = this.readTabAccount() ?? this.storage.get<Partial<Account>>(SESSION_KEY);
    if (!stored || !isRole(stored.role) || typeof stored.name !== 'string') {
      return null;
    }
    const account: Account = {
      role: stored.role,
      name: stored.name,
      ident: stored.ident ?? '',
      roleLabel: stored.roleLabel ?? '',
      entity: stored.entity ?? '',
    };
    if (account.role === 'admin' || account.role === 'manager') {
      return account;
    }
    // Seul l'agent de traitement choisit son entité (« Voir en tant que ») ; les autres profils
    // reprennent le compte du jeu de données actif.
    if (account.role === 'traitement' && entiteOf(account.entity)?.trait) {
      return { ...account, entity: normalizeEntity(account.entity) };
    }
    const fallback = demoAccounts().find((candidate) => candidate.role === account.role);
    if (fallback && entiteOf(fallback.entity)) {
      return fallback;
    }
    // Entité supprimée ou renommée par l'administrateur : retour à l'administration.
    setTimeout(() =>
      this.toast.warning(
        "Le profil enregistré n'existe plus (entité supprimée ou renommée) : retour à l'accueil Administrateur.",
      ),
    );
    return demoAccounts().find((candidate) => candidate.role === 'admin') ?? null;
  }

  private readTabAccount(): Partial<Account> | null {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Account> | null;
    } catch {
      return null;
    }
  }
}
