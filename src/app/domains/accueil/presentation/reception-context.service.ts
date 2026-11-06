import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { entityCode, entiteOf, recepOf } from '../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../dossiers/infrastructure/store/referentiel.store';
import { ReceptionStore } from '../infrastructure/store/reception.store';

@Service()
export class ReceptionContext {
  private readonly session = inject(SessionService);
  private readonly reception = inject(ReceptionStore);
  private readonly referentiel = inject(ReferentielStore);

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

  readonly by = computed(() => this.session.account()?.name ?? '');

  readonly etats = this.reception.etats;
  readonly nonPrisEnCharge = this.reception.nonPrisEnCharge;
  readonly retoursARenvoyer = this.reception.retoursARenvoyer;
  readonly dossiersReceptionnes = this.reception.dossiersReceptionnes;

  load(): void {
    void this.reception.load().catch(() => undefined);
  }
}
