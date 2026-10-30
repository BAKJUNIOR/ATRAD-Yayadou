import {
  buildDossierData,
  changedLabels,
  emptyDossierForm,
  fieldError,
  formValueOf,
} from './dossier-form.rules';

const TODAY = '2026-10-12';

describe('dossier form rules', () => {
  it('requires a 12-digit client number', () => {
    expect(fieldError('client', '', 'Réclamation', TODAY)).toBe('Champ obligatoire.');
    expect(fieldError('client', '123', 'Réclamation', TODAY)).toContain('(3/12)');
    expect(fieldError('client', '000123456789', 'Réclamation', TODAY)).toBe('');
  });

  it('accepts a zero amount only where it is allowed', () => {
    expect(fieldError('montantPret', '0', 'Demande de prêt', TODAY)).toBe(
      'Nombre positif attendu.',
    );
    expect(fieldError('apport', '0', 'Demande de prêt', TODAY)).toBe('');
  });

  it('rejects an expired identity document for a KYC update', () => {
    expect(fieldError('expiration', '2020-01-01', 'Mise à jour KYC', TODAY)).toContain('expirée');
    expect(fieldError('expiration', '2030-01-01', 'Mise à jour KYC', TODAY)).toBe('');
  });

  it('reports how many fields must be fixed', () => {
    const result = buildDossierData(emptyDossierForm(), [], TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // N° client + les deux champs obligatoires d'une ouverture de compte.
      expect(result.error).toContain('3 champ(s)');
    }
  });

  it('builds a dossier with formatted type-specific information', () => {
    const result = buildDossierData(
      {
        ...emptyDossierForm(),
        type: 'Demande de prêt',
        client: '000123456789',
        prenom: ' Awa ',
        nom: 'Sylla',
        compte: 'cpt-0042817',
        extra: { montantPret: '5000000', duree: '36', apport: '0' },
      },
      [],
      TODAY,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.client).toBe('Awa Sylla');
      expect(result.data.compte).toBe('CPT-0042817');
      expect(result.data.montant).toBe('5 000 000 FCFA');
      expect(result.data.extra).toEqual([
        { label: 'Montant demandé', value: '5 000 000 FCFA' },
        { label: 'Durée souhaitée', value: '36 mois' },
        { label: 'Apport personnel', value: '0 FCFA' },
      ]);
    }
  });

  it('lists what changed between two versions and reloads a dossier into the form', () => {
    const build = (nom: string, duree: string) => {
      const result = buildDossierData(
        {
          ...emptyDossierForm(),
          type: 'Demande de prêt',
          client: '000123456789',
          nom,
          extra: { montantPret: '100', duree, apport: '0' },
        },
        [],
        TODAY,
      );
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    };
    const before = build('Sylla', '12');
    expect(changedLabels(before, build('Sylla', '12'))).toEqual([]);
    expect(changedLabels(before, build('Koné', '24'))).toEqual(['Nom', 'Durée souhaitée']);

    const reloaded = formValueOf({ ...before, id: 'd-1', ref: 'DOS-1', createdAt: '', log: [] });
    expect(reloaded.client).toBe('000123456789');
    expect(reloaded.extra['duree']).toBe('12');
  });
});
