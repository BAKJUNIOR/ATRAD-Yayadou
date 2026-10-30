import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { entityCode, entiteOf, recepOf } from '../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../dossiers/infrastructure/store/referentiel.store';
import { ReceptionStore } from '../infrastructure/store/reception.store';

/**
 * Point de vue de l'entité réceptrice de l'utilisateur : l'agent d'accueil, ou l'agent de
 * traitement dont l'entité réceptionne aussi des états. Chacun ne voit que les états qui lui
 * sont destinés et les dossiers qui en sont issus.
 */
@Service()
export class ReceptionContext {
  private readonly session = inject(SessionService);
  private readonly reception = inject(ReceptionStore);
  private readonly referentiel = inject(ReferentielStore);

  /** Code de l'entité réceptrice de l'utilisateur, vide s'il ne réceptionne pas. */
  readonly recepCode = computed(() => {
    this.referentiel.value();
    const account = this.session.account();
    if (account?.role === 'accueil') {
      return entityCode(account.entity);
    }
    if (account?.role === 'traitement') {
      const entite = entiteOf(account.entity);
      return entite?.recep ? entite.code : '';
    }
    return '';
  });

  readonly canReceive = computed(() => !!this.recepCode());

  /** Signature d'un pointage : l'utilisateur connecté. */
  readonly by = computed(() => this.session.account()?.name ?? '');

  /** États destinés à l'entité réceptrice (lus dans l'API par `load()`). */
  readonly etats = this.reception.etats;
  readonly nonPrisEnCharge = this.reception.nonPrisEnCharge;
  readonly retoursARenvoyer = this.reception.retoursARenvoyer;
  readonly dossiersReceptionnes = this.reception.dossiersReceptionnes;

  /** Charge les états de l'entité réceptrice ; une erreur est déjà signalée par l'intercepteur. */
  load(): void {
    void this.reception.load().catch(() => undefined);
  }
}
