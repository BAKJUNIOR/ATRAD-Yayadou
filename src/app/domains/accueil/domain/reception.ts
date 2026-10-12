import { Status } from '../../../shared/models/status';
import { DOSSIER_TYPES, DossierType } from '../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../dossiers/domain/entities/etat.entity';
import { DEFAULT_MAPPING, ENTITES } from '../../dossiers/domain/routing';

/** Critères de recherche d'un état ; une chaîne vide signifie « tous ». */
export interface EtatCriteria {
  ref: string;
  num: string;
  prenom: string;
  compte: string;
  agence: string;
  type: string;
  statut: Status | '';
}

export const EMPTY_ETAT_CRITERIA: EtatCriteria = {
  ref: '',
  num: '',
  prenom: '',
  compte: '',
  agence: '',
  type: '',
  statut: '',
};

export const ETAT_STATUS_OPTIONS: readonly Status[] = [
  'Transmis',
  'Reçu partiellement',
  'Reçu',
  'En cours',
  'Rejeté',
  'Clôturé',
];

/** Nombre de critères avancés renseignés (tout sauf la référence). */
export function advancedCount(criteria: EtatCriteria): number {
  const { ref: _ref, ...advanced } = criteria;
  return Object.values(advanced).filter((value) => value.trim()).length;
}

export function isSearchActive(criteria: EtatCriteria): boolean {
  return !!criteria.ref.trim() || advancedCount(criteria) > 0;
}

/** États correspondant aux critères, du plus récemment transmis au plus ancien. */
export function searchEtats(etats: readonly Etat[], criteria: EtatCriteria): Etat[] {
  const ref = criteria.ref.trim().toLowerCase();
  const num = criteria.num.trim().toLowerCase();
  const prenom = criteria.prenom.trim().toLowerCase();
  const compte = criteria.compte.trim().toLowerCase();
  return etats
    .filter((etat) => {
      if (ref && !etat.ref.toLowerCase().includes(ref)) {
        return false;
      }
      if (num && !etat.dossiers.some((dossier) => dossier.num.toLowerCase().includes(num))) {
        return false;
      }
      if (
        (prenom || compte) &&
        !etat.dossiers.some(
          (dossier) =>
            (!prenom || (dossier.prenom || dossier.client).toLowerCase().includes(prenom)) &&
            (!compte || dossier.compte.toLowerCase().includes(compte)),
        )
      ) {
        return false;
      }
      return (
        (!criteria.agence || etat.agence === criteria.agence) &&
        (!criteria.type || etat.type === criteria.type) &&
        (!criteria.statut || etat.status === criteria.statut)
      );
    })
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/** Dossiers d'un état que l'Accueil n'a pas encore pointés comme reçus. */
export function remainingCount(etat: Etat): number {
  return etat.dossiers.filter((dossier) => !dossier.rec).length;
}

/** États dont au moins un dossier reste à réceptionner. */
export function pendingEtats(etats: readonly Etat[]): Etat[] {
  return etats.filter((etat) => remainingCount(etat) > 0);
}

/** Dossiers retournés par une entité, que l'Accueil doit encore renvoyer à leur agence. */
export function pendingReturns(dossiers: readonly RoutedDossier[]): RoutedDossier[] {
  return dossiers.filter((dossier) => dossier.status === 'Dossier retourné' && !dossier.renvoyeAt);
}

/** Dossiers routés qu'aucun gestionnaire n'a encore pris en charge. */
export function isUnassigned(dossier: RoutedDossier): boolean {
  return dossier.status === 'Reçu' && !dossier.gest;
}

/** Dossiers suivis par l'Accueil : routés, hors retours. */
export function trackedDossiers(dossiers: readonly RoutedDossier[]): RoutedDossier[] {
  return dossiers.filter(
    (dossier) => dossier.status !== 'Dossier retourné' && dossier.status !== 'Rejeté',
  );
}

export interface TrackingKpi {
  label: string;
  value: number;
  hint: string;
  textClass: string;
}

export function trackingKpis(
  etats: readonly Etat[],
  dossiers: readonly RoutedDossier[],
): TrackingKpi[] {
  const tracked = trackedDossiers(dossiers);
  const all = etats.flatMap((etat) => etat.dossiers);
  return [
    {
      label: 'États reçus',
      value: etats.filter((etat) => etat.receivedAt).length,
      hint: 'réception confirmée',
      textClass: 'text-ink',
    },
    {
      label: 'États à réceptionner',
      value: pendingEtats(etats).length,
      hint: 'au moins un dossier non pointé',
      textClass: 'text-warning',
    },
    {
      label: 'Dossiers réceptionnés',
      value: tracked.length,
      hint: 'routés vers une entité',
      textClass: 'text-brand-ink',
    },
    {
      label: 'Dossiers non reçus',
      value: all.filter((dossier) => !dossier.rec && dossier.nonRec).length,
      hint: 'signalés à la réception',
      textClass: 'text-danger',
    },
    {
      label: 'Non pris en charge',
      value: tracked.filter(isUnassigned).length,
      hint: "en attente dans l'entité",
      textClass: 'text-warning',
    },
    {
      label: 'Retours à renvoyer',
      value: pendingReturns(dossiers).length,
      hint: "vers l'agence d'origine",
      textClass: 'text-info',
    },
  ];
}

export interface TrackingGroup {
  entite: string;
  /** Types de dossier rattachés à l'entité par la règle de routage. */
  types: string;
  rows: RoutedDossier[];
  /** Dossiers de l'entité non pris en charge, avant filtrage. */
  pending: number;
}

export interface TrackingFilter {
  entite: string;
  query: string;
  pendingOnly: boolean;
}

/** Dossiers routés, regroupés par entité de traitement. */
export function trackingGroups(
  dossiers: readonly RoutedDossier[],
  filter: TrackingFilter,
): TrackingGroup[] {
  const tracked = trackedDossiers(dossiers);
  const query = filter.query.trim().toLowerCase();
  return ENTITES.filter((entite) => !filter.entite || entite.name === filter.entite)
    .map((entite) => {
      const ofEntity = tracked.filter((dossier) => dossier.entite === entite.name);
      const rows = ofEntity
        .filter((dossier) => !filter.pendingOnly || isUnassigned(dossier))
        .filter(
          (dossier) =>
            !query ||
            `${dossier.ref} ${dossier.client} ${dossier.etat}`.toLowerCase().includes(query),
        )
        .sort((a, b) => b.affecte.localeCompare(a.affecte));
      const types = DOSSIER_TYPES.filter((type) => DEFAULT_MAPPING[type] === entite.name);
      return {
        entite: entite.name,
        types: types.join(' · '),
        rows,
        pending: ofEntity.filter(isUnassigned).length,
      };
    })
    .filter((group) => group.rows.length > 0 || group.types);
}

/** Règle de routage affichée pour information : type de dossier → entité. */
export function routingRules(): { type: DossierType; entite: string }[] {
  return DOSSIER_TYPES.map((type) => ({ type, entite: DEFAULT_MAPPING[type] || '—' }));
}
