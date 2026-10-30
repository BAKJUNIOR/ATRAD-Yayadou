import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { Router } from '@angular/router';
import { NAVIGATION, ROLE_CAPABILITY } from '../../../../../core/navigation/navigation';
import { SessionService } from '../../../../../core/services/session.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatDate, formatStamp, isoDateToFr } from '../../../../../core/utils/date.util';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { StatCardComponent } from '../../../../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { pendingEtats, remainingCount } from '../../../../accueil/domain/reception';
import { ReceptionContext } from '../../../../accueil/presentation/reception-context.service';
import { hasCapability } from '../../../../dossiers/domain/referentiel';
import { Account, Role } from '../../../../auth/domain/entities/account.entity';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { isLocked } from '../../../../dossiers/domain/workflow';
import { BrouillonStore } from '../../../../agence/infrastructure/store/brouillon.store';
import { statusOf } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { SLA_TARGET } from '../../../../pilotage/domain/indicators';
import { PilotageApi } from '../../../../pilotage/infrastructure/api/pilotage.api';
import { isLate } from '../../../../traitement/domain/portfolio';
import { TraitementContext } from '../../../../traitement/presentation/traitement-context.service';
import { Dashboard, DashboardAction } from '../../../domain/entities/dashboard.entity';
import { DASHBOARD_MOCK } from '../../../infrastructure/mock/dashboard.mock';

const LIFECYCLE = [
  {
    title: 'Entité émettrice',
    description: "Crée les dossiers et constitue l'état de transmission (agence, service…).",
  },
  {
    title: 'Entité réceptrice',
    description:
      'Confirme la réception ; chaque dossier est dispatché vers son entité de traitement, ou pris en charge directement si elle le traite.',
  },
  { title: 'Entité de traitement', description: 'Instruit, valide puis clôture le dossier.' },
];

const PRIMARY_ICON: Record<Role, IconName> = {
  agence: 'plus',
  accueil: 'search',
  traitement: 'folder',
  manager: 'chart',
  admin: 'users',
};

/** Accueil commun à tous les profils : son contenu dépend du rôle connecté. */
@Component({
  selector: 'app-home',
  imports: [IconComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly session = inject(SessionService);
  private readonly brouillon = inject(BrouillonStore);
  private readonly pilotageApi = inject(PilotageApi);
  private readonly router = inject(Router);
  private readonly traitement = inject(TraitementContext);
  private readonly reception = inject(ReceptionContext);
  private readonly toast = inject(ToastService);

  protected readonly lifecycle = LIFECYCLE;

  protected readonly dashboard = computed<Dashboard | null>(() => {
    const account = this.session.account();
    if (!account) {
      return null;
    }
    // Textes de l'écran propres au profil ; la salutation reprend le prénom du compte connecté.
    const base = {
      ...DASHBOARD_MOCK[account.role],
      greeting: `Bonjour ${account.name.split(' ')[0]}`,
    };
    // Les profils dont le parcours est construit affichent les données réelles.
    if (account.role === 'agence') {
      return { ...base, ...this.agenceDashboard(account) };
    }
    if (account.role === 'accueil') {
      return { ...base, ...this.accueilDashboard() };
    }
    if (account.role === 'traitement') {
      return { ...base, ...this.traitementDashboard() };
    }
    if (account.role === 'manager') {
      return { ...base, ...this.managerDashboard() };
    }
    return base;
  });

  protected readonly primaryPath = computed(() => {
    const role = this.session.role();
    return role ? NAVIGATION[role].primaryPath : '/';
  });
  protected readonly primaryIcon = computed<IconName>(() => {
    const role = this.session.role();
    return role ? PRIMARY_ICON[role] : 'plus';
  });

  /** Écran principal du profil, refusé si l'entité n'a pas la capacité correspondante. */
  protected openPrimary(): void {
    const account = this.session.account();
    const capability = account ? ROLE_CAPABILITY[account.role] : undefined;
    const entity = account?.role === 'traitement' ? this.traitement.entite() : account?.entity;
    if (capability && !hasCapability(entity ?? '', capability)) {
      this.toast.warning(
        "Votre entité n'a pas la capacité requise (Administration › Paramétrage › Entités).",
      );
      return;
    }
    void this.router.navigateByUrl(this.primaryPath());
  }

  protected runAction(actions: DashboardAction[], event: Event): void {
    const select = event.target as HTMLSelectElement;
    const action = actions.find((candidate) => candidate.id === select.value);
    select.value = '';
    if (action && !action.disabledReason) {
      void this.router.navigateByUrl(action.path);
    }
  }

  private agenceDashboard(account: Account): Partial<Dashboard> {
    const draft = this.brouillon.draft();
    const etats = this.brouillon.etatsEmis();
    const closed = this.brouillon.clotures();
    return {
      subline: `${draft.length} dossier(s) au statut Temporaire dans l'état en cours de constitution.`,
      stats: [
        {
          label: 'Dossiers temporaires',
          value: String(draft.length),
          hint: 'à intégrer à un état',
          tone: 'warning',
        },
        {
          label: 'États transmis',
          value: String(etats.length),
          hint: 'toutes périodes',
          tone: 'heading',
        },
        {
          label: 'En attente de réception',
          value: String(etats.filter((etat) => !etat.receivedAt).length),
          hint: "non confirmés par l'entité réceptrice",
          tone: 'danger',
        },
        {
          label: 'Dossiers clôturés',
          value: String(closed),
          hint: 'cumul',
          tone: 'success',
        },
      ],
      rows: etats.slice(0, 5).map((etat) => ({
        ref: etat.ref,
        label: `${etat.etTypeNom ?? etat.type} — ${etat.count ?? etat.dossiers.length} dossier(s)`,
        meta: this.etatMeta(etat),
        status: etat.status,
      })),
    };
  }

  private accueilDashboard(): Partial<Dashboard> {
    const etats = this.reception.etats();
    const pending = pendingEtats(etats).length;
    const toAssign = this.reception.nonPrisEnCharge();
    return {
      subline: `${pending} état(s) de transmission attendent une confirmation de réception.`,
      stats: [
        {
          label: 'À réceptionner',
          value: String(pending),
          hint: 'statut Transmis',
          tone: 'warning',
        },
        {
          label: 'Réceptionnés',
          value: String(etats.filter((etat) => etat.receivedAt).length),
          hint: 'réception confirmée',
          tone: 'brand',
        },
        {
          label: 'Dossiers à affecter',
          value: String(toAssign),
          hint: 'en attente de gestionnaire',
          tone: 'info',
        },
        {
          label: 'Dossiers affectés',
          value: String(this.reception.dossiersReceptionnes()),
          hint: 'au total',
          tone: 'success',
        },
      ],
      rows: etats.map((etat) => ({
        ref: etat.ref,
        label: `${etat.agence} — ${etat.dossiers.length} dossier(s)`,
        meta: this.etatMeta(etat),
        status: etat.status,
        actions: this.etatActions(etat),
      })),
    };
  }

  private traitementDashboard(): Partial<Dashboard> {
    const context = this.traitement;
    const entity = context.entityDossiers();
    const mine = context.myDossiers();
    const active = mine.filter((dossier) => !isLocked(dossier)).length;
    const late = mine.filter((dossier) => isLate(dossier, context.today)).length;
    const waiting =
      context.mode() === 'pool' ? context.poolDossiers().length : context.bacDossiers().length;
    const done = entity.filter(
      (dossier) => dossier.status === 'Validé' || dossier.status === 'Clôturé',
    ).length;
    let queue = '';
    if (waiting && context.mode() === 'pool') {
      queue = ` ${waiting} dossier(s) disponible(s) dans le pool.`;
    } else if (waiting && context.mode() === 'disp') {
      queue = ` ${waiting} dossier(s) dans le bac à répartir.`;
    }
    return {
      greeting: `Bonjour ${context.user().split(' ')[0]}`,
      subline: `${active} dossier(s) en portefeuille, dont ${late} au-delà du délai de traitement.${queue}`,
      stats: [
        {
          label: 'Dossiers affectés',
          value: String(active),
          hint: context.entite(),
          tone: 'heading',
        },
        {
          label: "En cours d'instruction",
          value: String(mine.filter((dossier) => dossier.status === 'En cours').length),
          hint: 'statut En cours',
          tone: 'warning',
        },
        { label: 'En retard', value: String(late), hint: 'action requise', tone: 'danger' },
        { label: 'Validés / clôturés', value: String(done), hint: 'cumul', tone: 'success' },
      ],
      rows: mine.slice(0, 5).map((dossier) => ({
        ref: dossier.ref,
        label: `${dossier.type} — ${dossier.client}`,
        meta: `Affecté le ${formatDate(dossier.affecte)} · échéance ${isoDateToFr(dossier.echeanceIso)} · priorité ${dossier.prio.toLowerCase()}`,
        status: dossier.status,
      })),
    };
  }

  /** Indicateurs du réseau calculés par l'API (tableau de bord et retards). */
  private readonly pilotage = toSignal(
    this.session.role() === 'manager'
      ? forkJoin({
          tableau: this.pilotageApi.tableauDeBord(),
          delais: this.pilotageApi.delais(),
        }).pipe(catchError(() => of(null)))
      : of(null),
    { initialValue: null },
  );

  private managerDashboard(): Partial<Dashboard> {
    const pilotage = this.pilotage();
    if (!pilotage) {
      return { subline: 'Chargement des indicateurs…', stats: [], rows: [] };
    }
    const { tableau, delais } = pilotage;
    const rate = tableau.respectDelais ?? 100;
    return {
      subline: `Taux de respect des délais : ${rate} % sur ${tableau.termines} dossier(s) traités (objectif ${SLA_TARGET} %).`,
      stats: [
        {
          label: 'Dossiers traités',
          value: String(tableau.termines),
          hint: 'validés ou clôturés',
          tone: 'heading',
        },
        {
          label: 'En cours',
          value: String(tableau.enCours),
          hint: 'dans le réseau',
          tone: 'warning',
        },
        {
          label: 'En retard',
          value: String(tableau.enRetard),
          hint: 'délai dépassé',
          tone: 'danger',
        },
        {
          label: 'Respect des délais',
          value: `${rate} %`,
          hint: `objectif ${SLA_TARGET} %`,
          tone: rate >= SLA_TARGET ? 'success' : 'warning',
        },
      ],
      // Points d'attention : les dossiers en retard, du plus critique au moins critique.
      rows: delais.retards.slice(0, 5).map((retard) => ({
        ref: retard.reference,
        label: `${retard.client} — ${retard.typeDossier}`,
        meta: `${retard.agence} · échéance ${isoDateToFr(retard.echeance)} · ${retard.joursDeRetard} j de retard`,
        status: retard.joursDeRetard > 0 ? 'En retard' : statusOf(retard.statut),
      })),
    };
  }

  private etatMeta(etat: Etat): string {
    return etat.receivedAt
      ? `Reçu le ${formatStamp(etat.receivedAt)}`
      : `Transmis le ${formatStamp(etat.sentAt)}`;
  }

  private etatActions(etat: Etat): DashboardAction[] {
    const detail = `/accueil-central/etats-recus/${etat.ref}`;
    return [
      { id: 'voir', label: 'Consulter', disabledReason: '', path: detail },
      {
        id: 'rec',
        label: etat.receivedAt ? 'Réceptionner les restants' : 'Réceptionner',
        disabledReason: remainingCount(etat) ? '' : 'tous les dossiers sont reçus',
        path: detail,
      },
      {
        id: 'aff',
        label: 'Voir le routage par entité',
        disabledReason: etat.receivedAt ? '' : "réceptionnez d'abord l'état",
        path: '/accueil-central/suivi-statistiques',
      },
    ];
  }
}
