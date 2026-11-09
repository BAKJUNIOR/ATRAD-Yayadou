import { newPasswordError } from './password.rules';

describe('règles du nouveau mot de passe', () => {
  it('suit les règles de l’API', () => {
    expect(newPasswordError('Court1!')).toContain('8 caractères');
    expect(newPasswordError('minuscule1!')).toContain('majuscule');
    expect(newPasswordError('SansChiffre!')).toContain('chiffre');
    expect(newPasswordError('SansSpecial1')).toContain('spécial');
    expect(newPasswordError('Valide-Mot2Passe')).toBe('');
  });
});
