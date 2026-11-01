import { accountFromUtilisateur } from './account.entity';
import { Utilisateur } from './utilisateur.entity';

const utilisateur = (overrides: Partial<Utilisateur> = {}): Utilisateur => ({
  id: 'u-1',
  matricule: 'a.diallo',
  nom: 'Diallo',
  prenom: 'Aminata',
  email: 'a.diallo@exemple.test',
  telephone: null,
  actif: true,
  derniereConnexion: null,
  creeLe: '2026-01-01T00:00:00Z',
  profils: ['AGENCE'],
  entite: { id: 'e-1', code: 'AG-014', nom: 'Agence Plateau' },
  fonction: 'AGENT',
  ...overrides,
});

describe('accountFromUtilisateur', () => {
  it('should build the account of an agency user', () => {
    expect(accountFromUtilisateur(utilisateur())).toEqual({
      id: 'u-1',
      role: 'agence',
      roles: ['agence'],
      ident: 'a.diallo',
      name: 'Aminata Diallo',
      roleLabel: 'Entité émettrice — Agence Plateau',
      entity: 'Agence Plateau (AG-014)',
      entityId: 'e-1',
    });
  });

  it('should keep every profile and show the first one in the application order', () => {
    const account = accountFromUtilisateur(utilisateur({ profils: ['MANAGER', 'TRAITEMENT'] }));
    expect(account?.role).toBe('traitement');
    expect(account?.roles).toEqual(['traitement', 'manager']);
  });

  it('should attach an administrator without entity to the administration', () => {
    const account = accountFromUtilisateur(utilisateur({ profils: ['ADMIN'], entite: null }));
    expect(account?.entity).toBe('Administration');
    expect(account?.entityId).toBeNull();
    expect(account?.roleLabel).toBe('Administrateur');
  });

  it('should refuse a user without any known profile', () => {
    expect(accountFromUtilisateur(utilisateur({ profils: ['INCONNU'] }))).toBeNull();
  });
});
