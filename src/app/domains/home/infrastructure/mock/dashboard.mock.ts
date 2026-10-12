import { Role } from '../../../auth/domain/entities/account.entity';
import { Dashboard } from '../../domain/entities/dashboard.entity';

/** Données fictives du prototype, à remplacer par `infrastructure/api/dashboard.api.ts`. */
export const DASHBOARD_MOCK: Record<Role, Dashboard> = {
  agence: {
    greeting: 'Bonjour Aminata',
    subline:
      '3 dossiers sont encore au statut Temporaire dans votre état en cours de constitution.',
    primaryLabel: 'Créer un état de transmission',
    stats: [
      { label: 'Dossiers temporaires', value: '3', hint: 'à intégrer à un état', tone: 'warning' },
      { label: 'États transmis ce mois', value: '18', hint: '+4 vs. août', tone: 'heading' },
      { label: 'En attente de réception', value: '2', hint: 'depuis plus de 24 h', tone: 'danger' },
      { label: 'Dossiers clôturés', value: '41', hint: 'cumul trimestre', tone: 'success' },
    ],
    listTitle: 'Vos derniers états de transmission',
    rows: [
      {
        ref: 'ET-2026-0412',
        label: 'Ouverture de compte — 4 dossiers',
        meta: 'Créé le 17/09/2026 à 09:12 · destination Accueil central',
        status: 'Temporaire',
      },
      {
        ref: 'ET-2026-0408',
        label: 'Demandes de prêt — 6 dossiers',
        meta: 'Transmis le 16/09/2026 à 16:40',
        status: 'Transmis',
      },
      {
        ref: 'ET-2026-0401',
        label: 'Réclamations — 2 dossiers',
        meta: 'Reçu le 15/09/2026 à 10:05 par M. Koné',
        status: 'Reçu',
      },
      {
        ref: 'ET-2026-0396',
        label: 'Ouverture de compte — 5 dossiers',
        meta: 'Instruction en cours — Entité Crédits',
        status: 'En cours',
      },
      {
        ref: 'ET-2026-0388',
        label: 'Demandes de prêt — 3 dossiers',
        meta: 'Clôturé le 12/09/2026',
        status: 'Clôturé',
      },
    ],
  },
  accueil: {
    greeting: 'Bonjour Moussa',
    subline: '7 états de transmission attendent une confirmation de réception.',
    primaryLabel: 'Rechercher un état reçu',
    stats: [
      { label: 'À réceptionner', value: '7', hint: 'dont 2 de plus de 24 h', tone: 'warning' },
      {
        label: "Réceptionnés aujourd'hui",
        value: '11',
        hint: '9 agences concernées',
        tone: 'brand',
      },
      { label: 'À déposer', value: '5', hint: 'routés, non pris en charge', tone: 'info' },
      { label: 'Routés ce jour', value: '23', hint: '3 entités de traitement', tone: 'success' },
    ],
    listTitle: 'États de transmission reçus',
    rows: [
      {
        ref: 'ET-2026-0412',
        label: 'Agence Plateau — 4 dossiers',
        meta: 'Transmis le 17/09/2026 à 09:12',
        status: 'Transmis',
      },
      {
        ref: 'ET-2026-0411',
        label: 'Agence Marcory — 8 dossiers',
        meta: 'Transmis le 17/09/2026 à 08:47',
        status: 'Transmis',
      },
      {
        ref: 'ET-2026-0409',
        label: 'Agence Yopougon — 3 dossiers',
        meta: 'Reçu le 16/09/2026 à 17:22',
        status: 'Reçu',
      },
      {
        ref: 'ET-2026-0407',
        label: 'Agence Cocody — 6 dossiers',
        meta: "Routé vers l'Entité Crédits",
        status: 'En cours',
      },
      {
        ref: 'ET-2026-0403',
        label: 'Agence Treichville — 2 dossiers',
        meta: "Pièce manquante signalée à l'agence",
        status: 'Rejeté',
      },
    ],
  },
  traitement: {
    greeting: 'Bonjour Fatou',
    subline: '12 dossiers vous sont affectés, dont 2 dépassent le délai de traitement.',
    primaryLabel: 'Ouvrir mes dossiers affectés',
    stats: [
      { label: 'Dossiers affectés', value: '12', hint: 'Entité Crédits', tone: 'heading' },
      { label: "En cours d'instruction", value: '6', hint: 'délai moyen 2,4 j', tone: 'warning' },
      { label: 'En retard', value: '2', hint: 'action requise', tone: 'danger' },
      { label: 'Validés cette semaine', value: '9', hint: 'dont 7 clôturés', tone: 'success' },
    ],
    listTitle: 'Mes dossiers affectés',
    rows: [
      {
        ref: 'DOS-88142',
        label: "Prêt habitat — Kouassi N'Guessan",
        meta: 'Affecté le 15/09 · échéance 18/09 · priorité haute',
        status: 'En retard',
      },
      {
        ref: 'DOS-88139',
        label: 'Prêt conso — Awa Sylla',
        meta: 'Affecté le 16/09 · échéance 19/09',
        status: 'En cours',
      },
      {
        ref: 'DOS-88137',
        label: 'Ouverture de compte — Ibrahim Touré',
        meta: 'Affecté le 16/09 · échéance 20/09',
        status: 'Reçu',
      },
      {
        ref: 'DOS-88130',
        label: 'Réclamation carte — Lucie Adjo',
        meta: 'Validé le 17/09 · en attente de clôture',
        status: 'Validé',
      },
      {
        ref: 'DOS-88124',
        label: 'Prêt auto — Marc Gbagbo',
        meta: 'Clôturé le 16/09 à 15:31',
        status: 'Clôturé',
      },
    ],
  },
  manager: {
    greeting: 'Bonjour Serge',
    subline: 'Le taux de respect des délais est de 87 % sur les 30 derniers jours.',
    primaryLabel: 'Ouvrir le tableau de bord',
    stats: [
      { label: 'Dossiers traités (30 j)', value: '412', hint: '12 agences', tone: 'heading' },
      { label: 'En cours', value: '76', hint: '4 entités de traitement', tone: 'warning' },
      { label: 'En retard', value: '14', hint: '3,4 % du portefeuille', tone: 'danger' },
      { label: 'Respect des délais', value: '87 %', hint: 'objectif 90 %', tone: 'success' },
    ],
    listTitle: "Points d'attention",
    rows: [
      {
        ref: 'AG-021',
        label: 'Agence Yopougon — délai moyen 4,8 j',
        meta: "Au-delà de l'objectif de 3 j",
        status: 'En retard',
      },
      {
        ref: 'ET-007',
        label: 'Entité Crédits — 31 dossiers en cours',
        meta: 'Charge la plus élevée du réseau',
        status: 'En cours',
      },
      {
        ref: 'DOS-88142',
        label: "Prêt habitat — Kouassi N'Guessan",
        meta: 'En retard de 2 jours',
        status: 'En retard',
      },
      {
        ref: 'AG-014',
        label: 'Agence Plateau — 100 % de réception confirmée',
        meta: 'Meilleure performance du mois',
        status: 'Validé',
      },
      {
        ref: 'ET-2026-0403',
        label: '2 dossiers rejetés — Treichville',
        meta: 'Motif : pièces justificatives incomplètes',
        status: 'Rejeté',
      },
    ],
  },
  admin: {
    greeting: 'Bonjour Nadia',
    subline: 'Version simplifiée : gestion des utilisateurs, entités et workflows.',
    primaryLabel: 'Gérer les utilisateurs',
    stats: [
      { label: 'Utilisateurs actifs', value: '148', hint: '5 rôles', tone: 'heading' },
      { label: 'Agences', value: '12', hint: '4 entités de traitement', tone: 'brand' },
      { label: 'Workflows actifs', value: '6', hint: '1 en brouillon', tone: 'info' },
      { label: 'Connexions 24 h', value: '96', hint: 'aucune anomalie', tone: 'success' },
    ],
    listTitle: "Journal d'audit récent",
    rows: [
      {
        ref: 'LOG-5521',
        label: 'Création utilisateur — k.ouattara',
        meta: '17/09/2026 à 09:40 · par admin',
        status: 'Validé',
      },
      {
        ref: 'LOG-5519',
        label: 'Modification workflow « Prêt habitat »',
        meta: '17/09/2026 à 08:15 · par admin',
        status: 'En cours',
      },
      {
        ref: 'LOG-5512',
        label: 'Désactivation compte — t.kouame',
        meta: '16/09/2026 à 18:02',
        status: 'Clôturé',
      },
      {
        ref: 'LOG-5508',
        label: 'Ajout entité — Entité Monétique',
        meta: '16/09/2026 à 11:27',
        status: 'Validé',
      },
      {
        ref: 'LOG-5501',
        label: 'Tentative de connexion refusée',
        meta: '16/09/2026 à 07:55 · 3 essais',
        status: 'Rejeté',
      },
    ],
  },
};
