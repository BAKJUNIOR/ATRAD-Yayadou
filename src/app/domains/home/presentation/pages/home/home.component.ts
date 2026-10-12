import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NAVIGATION } from '../../../../../core/navigation/navigation';
import { SessionService } from '../../../../../core/services/session.service';
import { formatStamp } from '../../../../../core/utils/date.util';
import { entityCode } from '../../../../../core/utils/text.util';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { StatCardComponent } from '../../../../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { pendingEtats, remainingCount } from '../../../../accueil/domain/reception';
import { Account, Role } from '../../../../auth/domain/entities/account.entity';
import { DEMO_ACCOUNTS } from '../../../../auth/infrastructure/mock/auth.mock';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { Dashboard, DashboardAction } from '../../../domain/entities/dashboard.entity';
import { DASHBOARD_MOCK } from '../../../infrastructure/mock/dashboard.mock';

const LIFECYCLE = [
  { title: 'Agence', description: "Crée les dossiers et constitue l'état de transmission." },
  {
    title: 'Accueil / entité centrale',
    description:
      'Confirme la réception ; chaque dossier est routé automatiquement vers son entité.',
  },
  { title: 'Entité de traitement', description: 'Instruit, valide puis clôture le dossier.' },
  { title: 'Pilotage', description: 'Suit les KPI, les délais et la charge par entité.' },
];

const PRIMARY_ICON: Record<Role, IconName> = {
  agence: 'plus',
  accueil: 'search',
  traitement: 'folder',
  manager: 'chart',
  admin: 'users',
};

const ROLE_SHORT: Record<Role, string> = {
  agence: 'Agence',
  accueil: 'Accueil',
  traitement: 'Traitement',
  manager: 'Pilotage',
  admin: 'Admin',
};

/** Accueil commun à tous les profils : son contenu dépend du rôle connecté. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly session = inject(SessionService);
  private readonly store = inject(TransmissionStore);
  private readonly router = inject(Router);

  protected readonly lifecycle = LIFECYCLE;
  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly roleShort = ROLE_SHORT;
  protected readonly role = this.session.role;

  protected readonly dashboard = computed<Dashboard | null>(() => {
    const account = this.session.account();
    if (!account) {
      return null;
    }
    const base = DASHBOARD_MOCK[account.role];
    // Les profils dont le parcours est construit affichent les données réelles.
    if (account.role === 'agence') {
      return { ...base, ...this.agenceDashboard(account) };
    }
    if (account.role === 'accueil') {
      return { ...base, ...this.accueilDashboard() };
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

  protected runAction(actions: DashboardAction[], event: Event): void {
    const select = event.target as HTMLSelectElement;
    const action = actions.find((candidate) => candidate.id === select.value);
    select.value = '';
    if (action && !action.disabledReason) {
      void this.router.navigateByUrl(action.path);
    }
  }

  /** Bascule de profil sans repasser par la connexion (démonstration). */
  protected switchTo(account: Account): void {
    this.session.signIn(account);
  }

  private agenceDashboard(account: Account): Partial<Dashboard> {
    const draft = this.store.draft();
    const etats = this.store.etats().filter((etat) => etat.code === entityCode(account.entity));
    const closed = this.store
      .dossiers()
      .filter((dossier) => dossier.agence === account.entity && dossier.status === 'Clôturé');
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
          hint: "non confirmés par l'Accueil",
          tone: 'danger',
        },
        {
          label: 'Dossiers clôturés',
          value: String(closed.length),
          hint: 'cumul',
          tone: 'success',
        },
      ],
      rows: etats
        .slice(-5)
        .reverse()
        .map((etat) => ({
          ref: etat.ref,
          label: `${etat.type} — ${etat.dossiers.length} dossier(s)`,
          meta: this.etatMeta(etat),
          status: etat.status,
        })),
    };
  }

  private accueilDashboard(): Partial<Dashboard> {
    const etats = this.store.etats();
    const dossiers = this.store.dossiers();
    const pending = pendingEtats(etats).length;
    const routedRefs = new Set(dossiers.map((dossier) => dossier.ref));
    const toAssign = etats
      .filter((etat) => etat.receivedAt)
      .flatMap((etat) => etat.dossiers)
      .filter((dossier) => !routedRefs.has(dossier.ref)).length;
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
          value: String(dossiers.length),
          hint: 'au total',
          tone: 'success',
        },
      ],
      rows: [...etats].reverse().map((etat) => ({
        ref: etat.ref,
        label: `${etat.agence} — ${etat.dossiers.length} dossier(s)`,
        meta: this.etatMeta(etat),
        status: etat.status,
        actions: this.etatActions(etat),
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
