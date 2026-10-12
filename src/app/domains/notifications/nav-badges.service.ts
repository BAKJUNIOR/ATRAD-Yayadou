import { Service, computed, inject } from '@angular/core';
import { isUnassigned, pendingEtats, pendingReturns } from '../accueil/domain/reception';
import { isLocked } from '../dossiers/domain/workflow';
import { TransmissionStore } from '../dossiers/infrastructure/store/transmission.store';
import { isLate, unassigned } from '../traitement/domain/portfolio';
import { TraitementContext } from '../traitement/presentation/traitement-context.service';

/** Compteurs affichés à côté des entrées du menu, par identifiant d'entrée. */
@Service()
export class NavBadgesService {
  private readonly store = inject(TransmissionStore);
  private readonly traitement = inject(TraitementContext);

  readonly counts = computed<Record<string, number>>(() => {
    const dossiers = this.store.dossiers();
    const mine = this.traitement.myDossiers();
    return {
      recherche: pendingEtats(this.store.etats()).length,
      affectation: dossiers.filter(isUnassigned).length,
      retours: pendingReturns(dossiers).length,
      // Profil traitement : portefeuille du membre incarné et bac de son entité.
      mesdossiers: mine.filter((dossier) => !isLocked(dossier)).length,
      retard: mine.filter((dossier) => isLate(dossier, this.traitement.today)).length,
      affectint: unassigned(this.traitement.entityDossiers()).length,
      pool: unassigned(this.traitement.entityDossiers()).length,
    };
  });
}
