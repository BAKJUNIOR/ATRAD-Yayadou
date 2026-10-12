import { Role } from '../../domains/auth/domain/entities/account.entity';
import { MemberFunction } from '../../domains/dossiers/domain/routing';

export interface NavItem {
  id: string;
  label: string;
  /** Glyphe du prototype affiché devant le libellé. */
  icon: string;
  /** Absent pour un groupe : l'entrée ne fait que replier / déplier ses `children`. */
  path?: string;
  children?: NavItem[];
  /** Fonction que l'agent doit avoir dans son entité pour voir l'entrée (profil traitement). */
  requires?: MemberFunction;
}

export interface NavMenu {
  /** Intitulé du parcours, repris dans la barre latérale et le fil d'Ariane. */
  title: string;
  /** Écran principal du profil, cible du bouton d'action de l'accueil. */
  primaryPath: string;
  items: NavItem[];
}

const HOME: NavItem = { id: 'accueil', label: 'Accueil', icon: '◱', path: '/' };

/** Menu de chaque profil. Les chemins doivent correspondre aux routes des domaines. */
export const NAVIGATION: Record<Role, NavMenu> = {
  agence: {
    title: 'Parcours agence',
    primaryPath: '/agence/creer-etat',
    items: [
      HOME,
      { id: 'creer', label: 'Créer un état', icon: '＋', path: '/agence/creer-etat' },
      { id: 'suivi', label: 'Suivi des dossiers', icon: '◷', path: '/agence/suivi' },
    ],
  },
  accueil: {
    title: 'Parcours accueil',
    primaryPath: '/accueil-central/etats-recus',
    items: [
      HOME,
      {
        id: 'recherche',
        label: 'États reçus',
        icon: '⌕',
        path: '/accueil-central/etats-recus',
      },
      {
        id: 'affectation',
        label: 'Suivi & statistiques',
        icon: '◫',
        path: '/accueil-central/suivi-statistiques',
      },
      {
        id: 'retours',
        label: 'Dossiers retournés',
        icon: '↩',
        path: '/accueil-central/dossiers-retournes',
      },
    ],
  },
  traitement: {
    title: 'Parcours traitement',
    primaryPath: '/traitement/mes-dossiers',
    items: [
      HOME,
      {
        id: 'mesdossiers',
        label: 'Mes dossiers',
        icon: '▤',
        path: '/traitement/mes-dossiers',
        requires: 'traiter',
      },
      {
        id: 'pool',
        label: 'Pool de dossiers',
        icon: '◌',
        path: '/traitement/pool',
        requires: 'pool',
      },
      {
        id: 'affectint',
        label: 'Affectation des dossiers',
        icon: '⇄',
        path: '/traitement/affectation',
        requires: 'affecter',
      },
      {
        id: 'tousdossiers',
        label: 'Rechercher des dossiers',
        icon: '⌕',
        path: '/traitement/recherche',
        requires: 'rechercher',
      },
      {
        id: 'retard',
        label: 'En retard & clôturés',
        icon: '!',
        path: '/traitement/retard-clotures',
        requires: 'traiter',
      },
    ],
  },
  manager: {
    title: 'Pilotage',
    primaryPath: '/pilotage/tableau-de-bord',
    items: [
      HOME,
      { id: 'kpi', label: 'Tableau de bord', icon: '◫', path: '/pilotage/tableau-de-bord' },
      { id: 'delais', label: 'Respect des délais', icon: '◷', path: '/pilotage/delais' },
      { id: 'agences', label: 'Vue par agence', icon: '⌗', path: '/pilotage/agences' },
      { id: 'rapports', label: 'Rapports', icon: '⎙', path: '/pilotage/rapports' },
    ],
  },
  admin: {
    title: 'Administration',
    primaryPath: '/administration/utilisateurs',
    items: [
      HOME,
      {
        id: 'param',
        label: 'Paramétrage',
        icon: '⚙',
        children: [
          {
            id: 'branding',
            label: 'Logo & Couleurs',
            icon: '◐',
            path: '/administration/logo-couleurs',
          },
          {
            id: 'routage',
            label: 'Routage & affectation',
            icon: '⇆',
            path: '/administration/routage',
          },
          {
            id: 'agences',
            label: 'Agences & entités',
            icon: '⌗',
            path: '/administration/agences-entites',
          },
        ],
      },
      {
        id: 'utilisateurs',
        label: 'Utilisateurs',
        icon: '☰',
        path: '/administration/utilisateurs',
      },
      {
        id: 'journal',
        label: "Journal d'audit",
        icon: '◷',
        path: '/administration/journal-audit',
      },
    ],
  },
};
