import { Role } from '../../domains/auth/domain/entities/account.entity';
import { IconName } from '../../shared/ui/icon/icon.component';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Absent pour un groupe : l'entrée ne fait que replier / déplier ses `children`. */
  path?: string;
  children?: NavItem[];
}

export interface NavMenu {
  /** Intitulé du parcours, repris dans la barre latérale et le fil d'Ariane. */
  title: string;
  /** Écran principal du profil, cible du bouton d'action de l'accueil. */
  primaryPath: string;
  items: NavItem[];
}

const HOME: NavItem = { id: 'accueil', label: 'Accueil', icon: 'home', path: '/' };

/** Menu de chaque profil. Les chemins doivent correspondre aux routes des domaines. */
export const NAVIGATION: Record<Role, NavMenu> = {
  agence: {
    title: 'Parcours agence',
    primaryPath: '/agence/creer-etat',
    items: [
      HOME,
      { id: 'creer', label: 'Créer un état', icon: 'plus', path: '/agence/creer-etat' },
      { id: 'suivi', label: 'Suivi des dossiers', icon: 'clock', path: '/agence/suivi' },
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
        icon: 'inbox',
        path: '/accueil-central/etats-recus',
      },
      {
        id: 'affectation',
        label: 'Suivi & statistiques',
        icon: 'chart',
        path: '/accueil-central/suivi-statistiques',
      },
      {
        id: 'retours',
        label: 'Dossiers retournés',
        icon: 'return',
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
        icon: 'folder',
        path: '/traitement/mes-dossiers',
      },
      { id: 'pool', label: 'Pool de dossiers', icon: 'layers', path: '/traitement/pool' },
      {
        id: 'affectint',
        label: 'Affectation des dossiers',
        icon: 'shuffle',
        path: '/traitement/affectation',
      },
      {
        id: 'tousdossiers',
        label: 'Rechercher des dossiers',
        icon: 'search',
        path: '/traitement/recherche',
      },
      {
        id: 'retard',
        label: 'En retard & clôturés',
        icon: 'alert',
        path: '/traitement/retard-clotures',
      },
    ],
  },
  manager: {
    title: 'Pilotage',
    primaryPath: '/pilotage/tableau-de-bord',
    items: [
      HOME,
      { id: 'kpi', label: 'Tableau de bord', icon: 'chart', path: '/pilotage/tableau-de-bord' },
      { id: 'delais', label: 'Respect des délais', icon: 'clock', path: '/pilotage/delais' },
      { id: 'agences', label: 'Vue par agence', icon: 'building', path: '/pilotage/agences' },
      { id: 'rapports', label: 'Rapports', icon: 'report', path: '/pilotage/rapports' },
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
        icon: 'settings',
        children: [
          {
            id: 'branding',
            label: 'Logo & Couleurs',
            icon: 'palette',
            path: '/administration/logo-couleurs',
          },
          {
            id: 'routage',
            label: 'Routage & affectation',
            icon: 'route',
            path: '/administration/routage',
          },
          {
            id: 'agences',
            label: 'Agences & entités',
            icon: 'building',
            path: '/administration/agences-entites',
          },
        ],
      },
      {
        id: 'utilisateurs',
        label: 'Utilisateurs',
        icon: 'users',
        path: '/administration/utilisateurs',
      },
      {
        id: 'journal',
        label: "Journal d'audit",
        icon: 'list',
        path: '/administration/journal-audit',
      },
    ],
  },
};
