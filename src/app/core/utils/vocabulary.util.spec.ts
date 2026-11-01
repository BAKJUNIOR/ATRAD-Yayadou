import { applyVocabulary } from './vocabulary.util';

const DEFAULT = { tiers: 'Tiers', dossier: 'Dossier' };

describe('applyVocabulary', () => {
  it('names the third party « Tiers » by default', () => {
    expect(applyVocabulary('Numéro client', DEFAULT)).toBe('Numéro tiers');
    expect(applyVocabulary('Clients servis', DEFAULT)).toBe('Tiers servis');
  });

  it('applies the labels chosen by the administrator, in the plural too', () => {
    const vocab = { tiers: 'Patient', dossier: 'Demande' };
    expect(applyVocabulary('Dossiers des clients', vocab)).toBe('Demandes des patients');
    expect(applyVocabulary('Nouveau dossier', vocab)).toBe('Nouveau demande');
  });

  it('turns the agency into the issuing entity, but keeps proper names', () => {
    expect(applyVocabulary('Retourné en agence', DEFAULT)).toBe("Retourné à l'entité émettrice");
    expect(applyVocabulary('Vue par agence', DEFAULT)).toBe('Vue par entité émettrice');
    expect(applyVocabulary('Agence émettrice', DEFAULT)).toBe('Entité émettrice');
    expect(applyVocabulary('Agence Plateau (AG-014)', DEFAULT)).toBe('Agence Plateau (AG-014)');
  });

  it('leaves texts without letters untouched', () => {
    expect(applyVocabulary('12 / 14', DEFAULT)).toBe('12 / 14');
  });
});
