import { Service, computed, inject } from '@angular/core';
import { pendingEtats } from '../accueil/domain/reception';
import { ReceptionContext } from '../accueil/presentation/reception-context.service';
import { isLocked } from '../dossiers/domain/workflow';
import { isLate } from '../traitement/domain/portfolio';
import { TraitementContext } from '../traitement/presentation/traitement-context.service';

/** Compteurs affichés à côté des entrées du menu, par identifiant d'entrée. */
@Service()
export class NavBadgesService {
  private readonly traitement = inject(TraitementContext);
  private readonly reception = inject(ReceptionContext);

  readonly counts = computed<Record<string, number>>(() => {
    // Écrans de réception : états et compteurs de l'entité réceptrice de l'utilisateur.
    const mine = this.traitement.myDossiers();
    return {
      recherche: pendingEtats(this.reception.etats()).length,
      affectation: this.reception.nonPrisEnCharge(),
      retours: this.reception.retoursARenvoyer(),
      // Profil traitement : portefeuille du membre incarné et bac de son entité.
      mesdossiers: mine.filter((dossier) => !isLocked(dossier)).length,
      retard: mine.filter((dossier) => isLate(dossier, this.traitement.today)).length,
      affectint: this.traitement.bacDossiers().length,
      pool: this.traitement.poolDossiers().length,
    };
  });
}
