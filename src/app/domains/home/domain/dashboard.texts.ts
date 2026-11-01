import { Role } from '../../auth/domain/entities/account.entity';
import { Dashboard } from './entities/dashboard.entity';

/**
 * Textes de la page d'accueil de chaque profil. Les chiffres et la liste sont calculés à partir de l'API par
 * l'écran ; la salutation reprend le prénom du compte connecté.
 */
export const DASHBOARD_TEXTS: Record<Role, Dashboard> = {
  agence: {
    greeting: 'Bonjour',
    subline: '',
    primaryLabel: 'Créer un état de transmission',
    stats: [],
    listTitle: 'Vos derniers états de transmission',
    rows: [],
  },
  accueil: {
    greeting: 'Bonjour',
    subline: '',
    primaryLabel: 'Rechercher un état reçu',
    stats: [],
    listTitle: 'États de transmission reçus',
    rows: [],
  },
  traitement: {
    greeting: 'Bonjour',
    subline: '',
    primaryLabel: 'Ouvrir mes dossiers affectés',
    stats: [],
    listTitle: 'Mes dossiers affectés',
    rows: [],
  },
  manager: {
    greeting: 'Bonjour',
    subline: '',
    primaryLabel: 'Ouvrir le tableau de bord',
    stats: [],
    listTitle: "Points d'attention",
    rows: [],
  },
  admin: {
    greeting: 'Bonjour',
    subline: '',
    primaryLabel: 'Gérer les utilisateurs',
    stats: [],
    listTitle: 'Dernières connexions',
    rows: [],
  },
};
