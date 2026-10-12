import { emailError, jobTitle, passwordErrors, phoneError, splitName } from './profile.rules';

describe('profile.rules', () => {
  it('should accept an empty or well-formed e-mail', () => {
    expect(emailError('')).toBe('');
    expect(emailError(' a.diallo@banque.ci ')).toBe('');
    expect(emailError('a.diallo@banque')).not.toBe('');
    expect(emailError('a diallo@banque.ci')).not.toBe('');
  });

  it('should accept an empty or plausible phone number', () => {
    expect(phoneError('')).toBe('');
    expect(phoneError('+225 07 00 00 00 00')).toBe('');
    expect(phoneError('0700')).not.toBe('');
    expect(phoneError('07 00 00 00 ab')).not.toBe('');
  });

  it('should validate a password change', () => {
    expect(
      passwordErrors({ current: 'ancien1', next: 'nouveau123', confirmation: 'nouveau123' }),
    ).toEqual({});
    expect(passwordErrors({ current: '', next: 'court1', confirmation: 'autre' })).toEqual({
      current: 'Saisissez votre mot de passe actuel.',
      next: 'Au moins 8 caractères.',
      confirmation: 'La confirmation ne correspond pas au nouveau mot de passe.',
    });
    expect(
      passwordErrors({ current: 'a', next: 'sanschiffre', confirmation: 'sanschiffre' }).next,
    ).toBe('Au moins une lettre et un chiffre.');
    expect(
      passwordErrors({ current: 'pareil123', next: 'pareil123', confirmation: 'pareil123' }).next,
    ).toContain('différent');
  });

  it('should split a full name and extract the job title', () => {
    expect(splitName('Aminata Diallo')).toEqual({ firstName: 'Aminata', lastName: 'Diallo' });
    expect(splitName('Jean Marc Kouassi')).toEqual({ firstName: 'Jean', lastName: 'Marc Kouassi' });
    expect(jobTitle("Agent d'agence — Agence Plateau")).toBe("Agent d'agence");
  });
});
