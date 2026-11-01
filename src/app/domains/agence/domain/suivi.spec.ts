import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { SuiviDossier, returnNotice } from './suivi';

function dossier(status: SuiviDossier['status'], routed?: Partial<RoutedDossier>): SuiviDossier {
  return { status, routed: routed as RoutedDossier | undefined } as SuiviDossier;
}

describe('returnNotice', () => {
  const today = '2026-10-12';

  it('should stay silent while the dossier is not routed or has nothing to report', () => {
    expect(returnNotice(dossier('Transmis'), today)).toBeNull();
    expect(returnNotice(dossier('En cours', {}), today)).toBeNull();
    expect(returnNotice(dossier('Retour en cours', { rejectReason: 'Motif' }), today)).toBeNull();
  });

  it('should list the awaited documents with their deadline', () => {
    const routed = {
      docsMissing: ['Bulletins de salaire', 'RIB'],
      docsDeadlineIso: '2026-10-19',
      docsNote: 'Originaux requis',
    };
    const status = 'En attente de document(s) complémentaire(s)';
    expect(returnNotice(dossier(status, routed), today)).toEqual({
      title: 'Document(s) complémentaire(s) attendu(s)',
      text: "Pièce(s) à fournir : Bulletins de salaire, RIB — avant le 19/10/2026. Remarque de l'entité : Originaux requis",
      complements: '',
    });
    expect(returnNotice(dossier(status, routed), '2026-10-20')?.text).toContain('(délai dépassé)');
  });

  it('should give the reason of a return for non-eligibility', () => {
    const routed = { rejectReason: 'Client non éligible', complements: 'Justificatif' };
    expect(returnNotice(dossier('Dossier retourné', routed), today)).toEqual({
      title: 'Motif du retour (non-éligibilité)',
      text: 'Client non éligible',
      complements: 'Justificatif',
    });
    expect(returnNotice(dossier('Retourné en agence', routed), today)?.title).toBe(
      "Renvoyé à l'agence (non-éligibilité)",
    );
  });

  it('should name the missing documents of a return for lack of documents', () => {
    const routed = {
      docsRetAt: '2026-10-12T10:00:00',
      docsMissing: ['RIB'],
      rejectReason: 'Délai',
    };
    expect(returnNotice(dossier('Dossier retourné', routed), today)).toEqual({
      title: 'Retourné faute de document(s)',
      text: 'Document(s) manquant(s) : RIB · motif : Délai',
      complements: '',
    });
  });
});
