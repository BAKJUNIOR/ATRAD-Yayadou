import { Service, computed, inject, signal } from '@angular/core';
import { ReceptionContext } from './reception-context.service';
import {
  EMPTY_ETAT_CRITERIA,
  EtatCriteria,
  advancedCount,
  isSearchActive,
  searchEtats,
} from '../domain/reception';

/**
 * Recherche d'états en cours à l'Accueil. Conservée hors de la page pour que « Retour aux
 * résultats », depuis le détail d'un état, retrouve la liste telle qu'elle était.
 */
@Service()
export class EtatSearchState {
  private readonly reception = inject(ReceptionContext);

  /** Critères en cours de saisie ; ils ne s'appliquent qu'à la validation du formulaire. */
  readonly draft = signal<EtatCriteria>(EMPTY_ETAT_CRITERIA);
  readonly applied = signal<EtatCriteria>(EMPTY_ETAT_CRITERIA);
  readonly advancedOpen = signal(false);

  readonly active = computed(() => isSearchActive(this.applied()));
  readonly results = computed(() =>
    this.active() ? searchEtats(this.reception.etats(), this.applied()) : [],
  );
  readonly draftAdvancedCount = computed(() => advancedCount(this.draft()));
  readonly appliedAdvancedCount = computed(() => advancedCount(this.applied()));

  patch(change: Partial<EtatCriteria>): void {
    this.draft.update((criteria) => ({ ...criteria, ...change }));
  }

  /** Applique les critères saisis et renvoie les états trouvés. */
  submit(): readonly { ref: string }[] {
    const criteria = this.draft();
    const trimmed: EtatCriteria = {
      ...criteria,
      ref: criteria.ref.trim(),
      num: criteria.num.trim(),
      prenom: criteria.prenom.trim(),
      compte: criteria.compte.trim(),
    };
    this.draft.set(trimmed);
    this.applied.set(trimmed);
    return this.results();
  }

  /** Efface la référence si elle est renseignée, sinon tous les critères avancés. */
  clearNoResult(): void {
    if (this.applied().ref) {
      this.draft.update((criteria) => ({ ...criteria, ref: '' }));
      this.applied.update((criteria) => ({ ...criteria, ref: '' }));
    } else {
      this.reset();
    }
  }

  reset(): void {
    this.draft.set(EMPTY_ETAT_CRITERIA);
    this.applied.set(EMPTY_ETAT_CRITERIA);
  }
}
