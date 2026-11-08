import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { RealtimeService } from '../../../../../core/realtime/realtime.service';
import { formatDate, formatTime } from '../../../../../core/utils/date.util';
import { STATUS_KEYS, Status } from '../../../../../shared/models/status';
import { IconComponent, IconName } from '../../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { DOSSIER_TYPES, DossierType } from '../../../../dossiers/domain/dossier-catalog';
import { etatFromApi } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { canPrintEtat } from '../../../../dossiers/domain/entities/etat.entity';
import { EtatApi } from '../../../../dossiers/infrastructure/api/etat.api';
import { BordereauService } from '../../../../dossiers/presentation/bordereau.service';
import {
  EMPTY_CRITERIA,
  SUIVI_STATUS_FILTERS,
  SuiviCriteria,
  countCriteria,
  matchesCriteria,
  shortStatusLabel,
  suiviRowFromApi,
} from '../../../domain/suivi';
import { SuiviAgenceApi } from '../../../infrastructure/api/suivi-agence.api';

const FILTER_ICONS: Partial<Record<Status, IconName>> = {
  Transmis: 'send',
  'En cours': 'clock',
  'En attente de document(s) complémentaire(s)': 'clock',
  'Dossier retourné': 'rotate',
  'Retourné en agence': 'list',
};

type TextCriterion = Exclude<keyof SuiviCriteria, 'type'>;
type CriterionKey = keyof SuiviCriteria;

const FILTERS: readonly { key: CriterionKey; label: string }[] = [
  { key: 'nom', label: 'Nom ou prénom du client' },
  { key: 'num', label: 'N° client' },
  { key: 'compte', label: 'N° de compte' },
  { key: 'ref', label: 'Référence du dossier' },
  { key: 'type', label: 'Type de dossier' },
  { key: 'etat', label: "N° de l'état" },
];
const DEFAULT_FILTERS: readonly CriterionKey[] = ['nom'];

@Component({
  selector: 'app-suivi-dossiers',
  imports: [RouterLink, IconComponent, StatusBadgeComponent],
  templateUrl: './suivi-dossiers.component.html',
})
export class SuiviDossiersComponent {
  private readonly suiviApi = inject(SuiviAgenceApi);
  private readonly etatApi = inject(EtatApi);
  private readonly bordereau = inject(BordereauService);
  private readonly router = inject(Router);

  protected readonly types = DOSSIER_TYPES;
  protected readonly shortStatus = shortStatusLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;

  protected readonly draft = signal<SuiviCriteria>(EMPTY_CRITERIA);
  private readonly applied = signal<SuiviCriteria>(EMPTY_CRITERIA);
  protected readonly statusFilter = signal<Status | null>(null);
  private readonly pickedEtat = signal('');

  private readonly shownFilters = signal<readonly CriterionKey[]>(DEFAULT_FILTERS);
  protected readonly hiddenFilters = computed(() =>
    FILTERS.filter((filter) => !this.shownFilters().includes(filter.key)),
  );

  private readonly realtime = inject(RealtimeService);

  private readonly all = toSignal(
    this.realtime
      .live(() => this.suiviApi.dossiers())
      .pipe(map((suivi) => suivi.dossiers.map(suiviRowFromApi))),
    { initialValue: [] },
  );
  private readonly etats = toSignal(
    this.realtime.live(() => this.etatApi.emis()).pipe(map((etats) => etats.map(etatFromApi))),
    {
      initialValue: [],
    },
  );
  private readonly matching = computed(() =>
    this.all().filter((dossier) => matchesCriteria(dossier, this.applied())),
  );

  protected readonly rows = computed(() => {
    const status = this.statusFilter();
    return this.matching().filter((dossier) => !status || dossier.status === status);
  });

  protected readonly filters = computed(() => {
    const matching = this.matching();
    const active = this.statusFilter();
    return [
      {
        status: null as Status | null,
        label: 'Tous les dossiers',
        icon: 'list' as IconName,
        modifier: 'status-all',
        count: matching.length,
        on: active === null,
        tip: 'Afficher tous les statuts',
      },
      ...SUIVI_STATUS_FILTERS.map((filter) => {
        const on = active === filter.status;
        return {
          status: filter.status as Status | null,
          label: filter.label,
          icon: FILTER_ICONS[filter.status] ?? ('list' as IconName),
          modifier: `status-${STATUS_KEYS[filter.status]}`,
          count: matching.filter((dossier) => dossier.status === filter.status).length,
          on,
          tip: on
            ? `Retirer le filtre « ${filter.status} »`
            : `Afficher uniquement « ${filter.status} »`,
        };
      }),
    ];
  });

  protected readonly criteriaCount = computed(() => countCriteria(this.applied()));
  protected readonly hasFilter = computed(() => this.criteriaCount() > 0 || !!this.statusFilter());
  protected readonly canReset = computed(() => this.hasFilter() || countCriteria(this.draft()) > 0);
  protected readonly filterLabel = computed(() => {
    const status = this.statusFilter();
    return [
      this.criteriaCount() ? `${this.criteriaCount()} critère(s)` : '',
      status ? `Statut : ${shortStatusLabel(status)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  });
  protected readonly emptyMessage = computed(() =>
    this.all().length
      ? 'Aucun dossier ne correspond à ces critères.'
      : 'Aucun dossier pour le moment.',
  );

  protected readonly printableEtats = computed(() =>
    this.etats()
      .filter((etat) => canPrintEtat(etat))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
  );

  protected readonly selectedEtat = computed(() => {
    const printable = this.printableEtats();
    if (printable.some((etat) => etat.ref === this.pickedEtat())) {
      return this.pickedEtat();
    }
    const shown = [...new Set(this.rows().map((dossier) => dossier.etatRef))];
    if (shown.length === 1 && printable.some((etat) => etat.ref === shown[0])) {
      return shown[0];
    }
    return printable[0]?.ref ?? '';
  });

  protected onCriterion(key: TextCriterion, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = key === 'num' ? input.value.replace(/\D/g, '').slice(0, 12) : input.value;
    input.value = value;
    this.draft.update((criteria) => ({ ...criteria, [key]: value }));
  }

  protected onType(event: Event): void {
    const type = (event.target as HTMLSelectElement).value as DossierType | '';
    this.draft.update((criteria) => ({ ...criteria, type }));
  }

  protected search(event: Event): void {
    event.preventDefault();
    this.applied.set(this.draft());
  }

  protected reset(): void {
    this.draft.set(EMPTY_CRITERIA);
    this.applied.set(EMPTY_CRITERIA);
    this.statusFilter.set(null);
    this.shownFilters.set(DEFAULT_FILTERS);
  }

  protected isShown(key: CriterionKey): boolean {
    return this.shownFilters().includes(key);
  }

  protected addFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const key = select.value as CriterionKey;
    select.value = '';
    if (key && !this.isShown(key)) {
      this.shownFilters.update((keys) => [...keys, key]);
    }
  }

  protected removeFilter(key: CriterionKey): void {
    this.shownFilters.update((keys) => keys.filter((candidate) => candidate !== key));
    this.draft.update((criteria) => ({ ...criteria, [key]: EMPTY_CRITERIA[key] }));
    this.applied.update((criteria) => ({ ...criteria, [key]: EMPTY_CRITERIA[key] }));
  }

  protected pickStatus(status: Status | null): void {
    this.statusFilter.update((current) => (current === status ? null : status));
  }

  protected onPickEtat(event: Event): void {
    this.pickedEtat.set((event.target as HTMLSelectElement).value);
  }

  protected open(id: string): void {
    void this.router.navigate(['/agence/suivi', id]);
  }

  protected printSelected(): void {
    const etat = this.printableEtats().find((candidate) => candidate.ref === this.selectedEtat());
    if (etat?.id) {
      this.bordereau.open(etat.id);
    }
  }
}
