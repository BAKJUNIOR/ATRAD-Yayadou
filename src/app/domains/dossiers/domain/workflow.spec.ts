import { defaultReferentiel, setReferentiel } from './referentiel';
import { ATTENTE_DOCS, actionCodeTo, isLocked, nextStatuses, targetOf } from './workflow';

describe('workflow', () => {
  it('lets a standard dossier be validated, then only closed', () => {
    expect(nextStatuses({ type: 'Demande de prêt', status: 'En cours' })).toEqual([
      'Validé',
      ATTENTE_DOCS,
      'Dossier retourné',
    ]);
    expect(nextStatuses({ type: 'Demande de prêt', status: 'Validé' })).toEqual(['Clôturé']);
    expect(nextStatuses({ type: 'Demande de prêt', status: 'Clôturé' })).toEqual([]);
  });

  it('gives complaints their own circuit, without validation', () => {
    expect(nextStatuses({ type: 'Réclamation', status: 'En cours' })).toEqual([
      'Projeté',
      'Traité',
    ]);
    expect(nextStatuses({ type: 'Réclamation', status: 'Projeté' })).toEqual([
      'Traité',
      'En cours',
    ]);
  });

  it('locks a dossier once it has left the entity', () => {
    expect(isLocked({ status: 'Dossier retourné' })).toBe(true);
    expect(isLocked({ status: 'Traité' })).toBe(true);
    expect(isLocked({ status: ATTENTE_DOCS })).toBe(false);
  });

  it('maps each action to the status it leads to', () => {
    expect(targetOf({ kind: 'valider' })).toBe('Validé');
    expect(targetOf({ kind: 'rejet_info', docs: ['RIB'], note: '' })).toBe(ATTENTE_DOCS);
    expect(targetOf({ kind: 'retour_docs', reason: '' })).toBe('Dossier retourné');
  });

  it('follows the circuit read from the API when there is one', () => {
    setReferentiel({
      ...defaultReferentiel(),
      typeCircuits: { 'Demande de prêt': 'STANDARD' },
      workflows: {
        STANDARD: [
          {
            source: 'EN_COURS',
            cible: 'VALIDE',
            actionCode: 'VALIDER',
            libelleAction: 'Valider',
            exigeMotif: false,
          },
          {
            source: 'VALIDE',
            cible: 'CLOTURE',
            actionCode: 'CLOTURER',
            libelleAction: 'Clôturer',
            exigeMotif: false,
          },
        ],
      },
    });
    const dossier = { type: 'Demande de prêt', status: 'En cours' as const };
    expect(nextStatuses(dossier)).toEqual(['Validé']);
    expect(actionCodeTo(dossier, 'Validé')).toBe('VALIDER');
    expect(actionCodeTo(dossier, 'Clôturé')).toBe('');
    setReferentiel(defaultReferentiel());
  });
});
