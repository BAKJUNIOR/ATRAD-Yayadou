import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatDate } from '../../../../../core/utils/date.util';
import { STATUS_KEYS } from '../../../../../shared/models/status';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { DOSSIER_TYPES, DossierType, Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import {
  DossierActionKind,
  isLocked,
  lockReason,
  nextStatuses,
} from '../../../../dossiers/domain/workflow';
import { shortStatusLabel } from '../../../../agence/domain/suivi';
import {
  DelayTone,
  PORTFOLIO_FILTERS,
  PortfolioCriteria,
  PortfolioFilter,
  delayOf,
  hasCriteria,
  isLate,
  matchesCriteria,
  matchesFilter,
} from '../../../domain/portfolio';
import { DossierActionsService } from '../../dossier-actions.service';
import { PortfolioFilterState } from '../../portfolio-filter.state';
import { TraitementContext } from '../../traitement-context.service';

/** Portée de la liste : mes dossiers, tous ceux de l'entité, ou les retards et clôtures. */
export type ListMode = 'mine' | 'all' | 'late';

const FILTER_ICONS: Record<string, IconName> = {
  Reçu: 'inbox',
  'En cours': 'clock',
  Projeté: 'pencil',
  late: 'alert',
  'En attente de document(s) complémentaire(s)': 'file',
  Validé: 'check-circle',
  Traité: 'check',
  Clôturé: 'archive',
};

const DELAY_TEXT: Record<DelayTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
  muted: 'text-ink-muted',
};

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

type TextCriterion = Exclude<keyof PortfolioCriteria, 'type'>;

/** Parcours traitement : portefeuille de dossiers, filtrable et actionnable ligne par ligne. */
@Component({
  selector: 'app-dossiers-list',
  imports: [RouterLink, CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent, StatusBadgeComponent],
  templateUrl: './dossiers-list.component.html',
})
export class DossiersListComponent {
  private readonly context = inject(TraitementContext);
  private readonly router = inject(Router);
  protected readonly state = inject(PortfolioFilterState);
  protected readonly actions = inject(DossierActionsService);

  /** Fourni par les données de la route. */
  readonly mode = input<ListMode>('mine');
  /** Onglet de l'écran « En retard & clôturés ». */
  readonly tab = input<string>();
  // Un paramètre d'URL absent arrive `undefined` : l'onglet par défaut est « En retard ».
  protected readonly currentTab = computed(() => (this.tab() === 'clos' ? 'clos' : 'retard'));

  protected readonly types = DOSSIER_TYPES;
  protected readonly priorityText = PRIORITY_TEXT;
  protected readonly delayText = DELAY_TEXT;
  protected readonly shortStatus = shortStatusLabel;
  protected readonly formatDate = formatDate;

  protected readonly title = computed(() =>
    this.mode() === 'all'
      ? "Tous les dossiers de l'entité"
      : `Mes dossiers — ${this.context.user()}`,
  );

  /** Sur « En retard & clôturés », le filtre est imposé par l'onglet. */
  protected readonly activeFilter = computed<PortfolioFilter>(() => {
    if (this.mode() !== 'late') {
      return this.state.filter();
    }
    return this.currentTab() === 'clos' ? 'Clôturé' : 'late';
  });

  private readonly base = computed(() =>
    this.mode() === 'all' ? this.context.entityDossiers() : this.context.myDossiers(),
  );
  private readonly matching = computed(() =>
    this.base().filter((dossier) => matchesCriteria(dossier, this.state.applied())),
  );
  protected readonly rows = computed(() =>
    this.matching()
      .filter((dossier) => matchesFilter(dossier, this.activeFilter(), this.context.today))
      .map((dossier) => this.toRow(dossier)),
  );

  protected readonly cards = computed(() => {
    const matching = this.matching();
    const active = this.activeFilter();
    return PORTFOLIO_FILTERS.map(({ filter, label }) => {
      const on = active === filter;
      const key = filter === null ? 'all' : filter === 'late' ? 'retard' : STATUS_KEYS[filter];
      return {
        filter,
        label,
        on,
        icon: filter === null ? ('list' as IconName) : FILTER_ICONS[filter],
        modifier: `status-${key}`,
        count: matching.filter((dossier) => matchesFilter(dossier, filter, this.context.today))
          .length,
        tip:
          filter === null
            ? 'Afficher tous les statuts'
            : on
              ? `Retirer le filtre « ${label} »`
              : `Afficher uniquement « ${label} »`,
      };
    });
  });

  protected readonly tabs = computed(() => {
    const dossiers = this.context.entityDossiers();
    return [
      {
        id: 'retard',
        label: 'En retard',
        count: dossiers.filter((dossier) => isLate(dossier, this.context.today)).length,
      },
      {
        id: 'clos',
        label: 'Clôturés',
        count: dossiers.filter((dossier) => dossier.status === 'Clôturé').length,
      },
    ];
  });

  protected readonly searchActive = computed(() => hasCriteria(this.state.applied()));
  protected readonly hasFilter = computed(
    () => this.searchActive() || this.activeFilter() !== null,
  );
  protected readonly canReset = computed(() => this.hasFilter() || hasCriteria(this.state.draft()));
  protected readonly filterLabel = computed(() => {
    const active = PORTFOLIO_FILTERS.find((entry) => entry.filter === this.activeFilter());
    return [
      this.searchActive() ? 'Recherche active' : '',
      active?.filter ? `Statut : ${active.label}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  });
  protected readonly emptyMessage = computed(() =>
    this.base().length
      ? 'Aucun dossier ne correspond à ces critères.'
      : 'Aucun dossier pour le moment.',
  );

  protected pick(filter: PortfolioFilter): void {
    this.state.filter.update((current) => (filter === null || current === filter ? null : filter));
    // Depuis « En retard & clôturés », une carte ramène au portefeuille filtré.
    if (this.mode() === 'late') {
      void this.router.navigate(['/traitement/mes-dossiers']);
    }
  }

  protected onCriterion(key: TextCriterion, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = key === 'num' ? input.value.replace(/\D/g, '').slice(0, 12) : input.value;
    input.value = value;
    this.state.draft.update((criteria) => ({ ...criteria, [key]: value }));
  }

  protected onType(event: Event): void {
    const type = (event.target as HTMLSelectElement).value as DossierType | '';
    this.state.draft.update((criteria) => ({ ...criteria, type }));
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.state.search();
  }

  protected open(ref: string): void {
    void this.router.navigate(['/traitement/dossiers', ref]);
  }

  private toRow(dossier: RoutedDossier) {
    const next = nextStatuses(dossier);
    const quick: DossierActionKind | null = next.includes('Validé')
      ? 'valider'
      : next.includes('Clôturé')
        ? 'cloturer'
        : null;
    const quickTarget = quick === 'valider' ? 'Validé' : 'Clôturé';
    return {
      dossier,
      agence: dossier.agence.replace(/\s*\([^)]*\)$/, ''),
      delay: delayOf(dossier, this.context.today),
      quick,
      quickLabel: quick === 'valider' ? 'Valider' : 'Clôturer',
      quickIcon: (quick === 'valider' ? 'check' : 'archive') as IconName,
      // L'action rapide n'est pas répétée dans le menu.
      transitions: this.actions
        .transitions(dossier)
        .filter((transition) => !quick || transition.target !== quickTarget),
      assignDisabledReason: isLocked(dossier) ? lockReason(dossier) : '',
    };
  }
}
