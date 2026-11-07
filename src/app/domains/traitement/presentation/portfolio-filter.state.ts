import { Service, computed, signal } from '@angular/core';
import { EMPTY_PORTFOLIO_CRITERIA, PortfolioCriteria, PortfolioFilter } from '../domain/portfolio';

type CriterionKey = keyof PortfolioCriteria;

export const PORTFOLIO_FILTERS: readonly { key: CriterionKey; label: string }[] = [
  { key: 'nom', label: 'Nom ou prénom du client' },
  { key: 'num', label: 'N° client' },
  { key: 'compte', label: 'N° de compte' },
  { key: 'ref', label: 'Référence du dossier' },
  { key: 'type', label: 'Type de dossier' },
];
const DEFAULT_FILTERS: readonly CriterionKey[] = ['nom'];

@Service()
export class PortfolioFilterState {
  readonly filter = signal<PortfolioFilter>(null);
  readonly draft = signal<PortfolioCriteria>(EMPTY_PORTFOLIO_CRITERIA);
  readonly applied = signal<PortfolioCriteria>(EMPTY_PORTFOLIO_CRITERIA);

  private readonly shown = signal<readonly CriterionKey[]>(DEFAULT_FILTERS);
  readonly hiddenFilters = computed(() =>
    PORTFOLIO_FILTERS.filter((filter) => !this.shown().includes(filter.key)),
  );

  isShown(key: CriterionKey): boolean {
    return this.shown().includes(key);
  }

  showFilter(key: CriterionKey): void {
    if (!this.isShown(key)) {
      this.shown.update((keys) => [...keys, key]);
    }
  }

  hideFilter(key: CriterionKey): void {
    this.shown.update((keys) => keys.filter((candidate) => candidate !== key));
    this.draft.update((criteria) => ({ ...criteria, [key]: EMPTY_PORTFOLIO_CRITERIA[key] }));
    this.applied.update((criteria) => ({ ...criteria, [key]: EMPTY_PORTFOLIO_CRITERIA[key] }));
  }

  search(): void {
    this.applied.set(this.draft());
  }

  reset(): void {
    this.draft.set(EMPTY_PORTFOLIO_CRITERIA);
    this.applied.set(EMPTY_PORTFOLIO_CRITERIA);
    this.filter.set(null);
    this.shown.set(DEFAULT_FILTERS);
  }
}
