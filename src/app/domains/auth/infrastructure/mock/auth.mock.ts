import { Service } from '@angular/core';
import { dataset } from '../../../dossiers/domain/dossier-catalog';
import { Account } from '../../domain/entities/account.entity';

/**
 * Comptes de démonstration, rattachés aux entités du jeu de données actif. Le profil Pilotage
 * n'est plus proposé à la connexion (prototype du 24/10) ; ses écrans restent en place.
 */
export function demoAccounts(): Account[] {
  const { agence, accueil, traitement } = dataset().accounts;
  const nameOf = (label: string): string => label.replace(/ \([^)]+\)$/, '');
  return [
    {
      role: 'agence',
      ident: 'a.diallo',
      name: 'Aminata Diallo',
      roleLabel: `Entité émettrice — ${nameOf(agence)}`,
      entity: agence,
    },
    {
      role: 'accueil',
      ident: 'm.kone',
      name: 'Moussa Koné',
      roleLabel: `Entité réceptrice — ${nameOf(accueil)}`,
      entity: accueil,
    },
    {
      role: 'traitement',
      ident: 'f.bamba',
      name: 'Fatou Bamba',
      roleLabel: 'Entité de traitement',
      entity: traitement,
    },
    {
      role: 'admin',
      ident: 'admin',
      name: 'Nadia Cissé',
      roleLabel: 'Administrateur — Système',
      entity: 'Administration',
    },
  ];
}

export type AuthResult = { ok: true; account: Account } | { ok: false; error: string };

/**
 * Authentification simulée, le temps de construire les écrans.
 * À remplacer par `infrastructure/api/auth.api.ts` au branchement de l'API : aucun mot de
 * passe n'est vérifié ici.
 */
@Service()
export class AuthMock {
  authenticate(ident: string, password: string): AuthResult {
    const account = demoAccounts().find(
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
