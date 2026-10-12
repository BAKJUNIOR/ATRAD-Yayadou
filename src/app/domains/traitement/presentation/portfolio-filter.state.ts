import { Service, signal } from '@angular/core';
import { EMPTY_PORTFOLIO_CRITERIA, PortfolioCriteria, PortfolioFilter } from '../domain/portfolio';

/**
 * Filtres du portefeuille, partagés par « Mes dossiers », « Rechercher des dossiers » et
 * « En retard & clôturés » : une carte-filtre choisie sur un écran reste active sur l'autre.
 */
@Service()
export class PortfolioFilterState {
  readonly filter = signal<PortfolioFilter>(null);
  /** Critères en cours de saisie ; ils ne s'appliquent qu'au clic sur « Rechercher ». */
  readonly draft = signal<PortfolioCriteria>(EMPTY_PORTFOLIO_CRITERIA);
  readonly applied = signal<PortfolioCriteria>(EMPTY_PORTFOLIO_CRITERIA);

  search(): void {
    this.applied.set(this.draft());
  }

  reset(): void {
    this.draft.set(EMPTY_PORTFOLIO_CRITERIA);
    this.applied.set(EMPTY_PORTFOLIO_CRITERIA);
    this.filter.set(null);
  }
}
