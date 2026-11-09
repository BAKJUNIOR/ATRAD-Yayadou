import { EtatTrouve, criteresPour, receptionOf } from './recherche';

const etat = (nombreRecus: number, recuLe: string | null): EtatTrouve => ({
  id: 'e1',
  reference: 'ET-2026-0047',
  entiteEmettrice: { id: 'a1', code: 'AG-014', nom: 'Agence Plateau' },
  agentEmetteur: 'Aminata Diallo',
  typeEtatNom: 'Accueil central',
  nombreDossiers: 3,
  nombreRecus,
  statut: nombreRecus ? 'RECU_PARTIELLEMENT' : 'TRANSMIS',
  transmisLe: '2026-11-02T09:00:00Z',
  recuLe,
});

describe('écran Recherche', () => {
  it('cache le critère « Code agence » à une agence', () => {
    expect(criteresPour('agence').map((critere) => critere.value)).not.toContain('AGENCE');
    expect(criteresPour('accueil').map((critere) => critere.value)).toContain('AGENCE');
  });

  it('affiche la réception avec le nombre de dossiers reçus, ou « Non reçu »', () => {
    expect(receptionOf(etat(0, null))).toEqual({ label: 'Non reçu', recu: false });
    const reception = receptionOf(etat(2, '2026-11-03T10:00:00'));
    expect(reception.recu).toBe(true);
    expect(reception.label).toBe('03/11/2026 (2/3)');
  });
});
