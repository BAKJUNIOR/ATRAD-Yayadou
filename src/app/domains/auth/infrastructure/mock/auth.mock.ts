import { Service } from '@angular/core';
import { Account } from '../../domain/entities/account.entity';

export const DEMO_ACCOUNTS: readonly Account[] = [
  {
    role: 'agence',
    ident: 'a.diallo',
    name: 'Aminata Diallo',
    roleLabel: "Agent d'agence — Agence Plateau",
    entity: 'Agence Plateau (AG-014)',
  },
  {
    role: 'accueil',
    ident: 'm.kone',
    name: 'Moussa Koné',
    roleLabel: 'Agent Accueil — Entité centrale',
    entity: 'Accueil central (EC-001)',
  },
  {
    role: 'traitement',
    ident: 'f.bamba',
    name: 'Fatou Bamba',
    roleLabel: 'Agent entité de traitement — Crédits',
    entity: 'Entité Crédits (ET-007)',
  },
  {
    role: 'manager',
    ident: 's.traore',
    name: 'Serge Traoré',
    roleLabel: 'Responsable — Direction des opérations',
    entity: 'Direction des opérations',
  },
  {
    role: 'admin',
    ident: 'admin',
    name: 'Nadia Cissé',
    roleLabel: 'Administrateur — Système',
    entity: 'Administration ATRAD',
  },
];

export type AuthResult = { ok: true; account: Account } | { ok: false; error: string };

/**
 * Authentification simulée, le temps de construire les écrans.
 * À remplacer par `infrastructure/api/auth.api.ts` au branchement de l'API : aucun mot de
 * passe n'est vérifié ici.
 */
@Service()
export class AuthMock {
  authenticate(ident: string, password: string): AuthResult {
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.ident === ident.trim().toLowerCase(),
    );
    if (!account) {
      return {
        ok: false,
        error: 'Identifiant inconnu. Utilisez un compte de démonstration ci-dessous.',
      };
    }
    if (!password) {
      return { ok: false, error: 'Veuillez saisir votre mot de passe.' };
    }
    return { ok: true, account };
  }
}
