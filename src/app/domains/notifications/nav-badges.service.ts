import { Service, computed, inject } from '@angular/core';
import { isUnassigned, pendingEtats, pendingReturns } from '../accueil/domain/reception';
import { TransmissionStore } from '../dossiers/infrastructure/store/transmission.store';

/** Compteurs affichés à côté des entrées du menu, par identifiant d'entrée. */
@Service()
export class NavBadgesService {
  private readonly store = inject(TransmissionStore);

  readonly counts = computed<Record<string, number>>(() => {
    const dossiers = this.store.dossiers();
    return {
      recherche: pendingEtats(this.store.etats()).length,
      affectation: dossiers.filter(isUnassigned).length,
      retours: pendingReturns(dossiers).length,
    };
  });
}
