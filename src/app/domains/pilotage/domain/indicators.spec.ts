import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { agenceComparison, lateDossiers, periods, sla } from './indicators';

const TODAY = '2026-10-18';

function dossier(ref: string, patch: Partial<RoutedDossier>): RoutedDossier {
  return {
    id: ref,
    ref,
    num: '000123456789',
    prenom: '',
    nom: '',
    compte: '',
    client: 'Client',
    type: 'Demande de prêt',
    produit: 'Compte courant',
    prio: 'Normale',
    note: '',
    pieces: [],
    extra: [],
    xraw: {},
    createdAt: '2026-10-12T08:00:00.000Z',
    log: [],
    status: 'En cours',
    agence: 'Agence Plateau (AG-014)',
    etat: 'ET-2026-0401',
    entite: 'Entité Crédits (ET-007)',
    affecte: '2026-10-12T08:00:00.000Z',
    affectedBy: 'Routage automatique',
    echeanceIso: '2026-10-17',
    delai: '5 j',
    gest: '',
    gestAt: '',
    ...patch,
  };
}

describe('steering indicators', () => {
  const validatedOnTime = dossier('DOS-1', {
    status: 'Validé',
    validatedAt: '2026-10-12T10:00:00.000Z',
  });
  const late = dossier('DOS-2', {});
  const veryLate = dossier('DOS-3', { echeanceIso: '2026-10-13' });

  it('measures compliance on treated dossiers only', () => {
    const result = sla([validatedOnTime, late, veryLate], TODAY);
    expect(result.treated).toHaveLength(1);
    expect(result.rate).toBe(100);
    expect(sla([late], TODAY).rate).toBe(0);
  });

  it('lists late dossiers from the most to the least overdue', () => {
    const rows = lateDossiers([validatedOnTime, late, veryLate], TODAY);
    expect(rows.map((row) => [row.dossier.ref, row.days])).toEqual([
      ['DOS-3', 5],
      ['DOS-2', 1],
    ]);
  });

  it('compares agencies by share of late dossiers', () => {
    const [agence] = agenceComparison([validatedOnTime, late, veryLate], TODAY);
    expect(agence.lateRate).toBe(67);
    expect(agence.tone).toBe('danger');
    expect(agence.averageDelay).toBe('0,0 j');
  });

  it('builds periods relative to the current day', () => {
    const [week, previous] = periods(TODAY);
    expect(week.label).toBe('Semaine en cours (12/10 – 18/10)');
    expect(previous.from).toBe('2026-10-05');
    expect(previous.to).toBe('2026-10-11');
  });
});
