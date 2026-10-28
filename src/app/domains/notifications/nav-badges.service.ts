import { Service, computed, inject } from '@angular/core';
import { isUnassigned, pendingEtats, pendingReturns } from '../accueil/domain/reception';
import { ReceptionContext } from '../accueil/presentation/reception-context.service';
import { isLocked } from '../dossiers/domain/workflow';
import { isLate, unassigned } from '../traitement/domain/portfolio';
import { TraitementContext } from '../traitement/presentation/traitement-context.service';

/** Compteurs affichés à côté des entrées du menu, par identifiant d'entrée. */
@Service()
export class NavBadgesService {
  private readonly traitement = inject(TraitementContext);
  private readonly reception = inject(ReceptionContext);

  readonly counts = computed<Record<string, number>>(() => {
    // Écrans de réception : états et dossiers de l'entité réceptrice de l'utilisateur.
    const dossiers = this.reception.dossiers();
    const mine = this.traitement.myDossiers();
    return {
      recherche: pendingEtats(this.reception.etats()).length,
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
