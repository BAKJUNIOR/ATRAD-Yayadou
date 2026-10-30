import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { entityCode, entiteOf, recepOf } from '../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../dossiers/infrastructure/store/referentiel.store';
import { TransmissionStore } from '../../dossiers/infrastructure/store/transmission.store';
import { TraitementContext } from '../../traitement/presentation/traitement-context.service';
import { ReceptionStore } from '../infrastructure/store/reception.store';

/**
 * Point de vue de l'entité réceptrice de l'utilisateur : l'agent d'accueil, ou l'agent de
 * traitement dont l'entité réceptionne aussi des états. Chacun ne voit que les états qui lui
 * sont destinés et les dossiers qui en sont issus.
 */
@Service()
export class ReceptionContext {
  private readonly session = inject(SessionService);
  private readonly store = inject(TransmissionStore);
  private readonly reception = inject(ReceptionStore);
  private readonly referentiel = inject(ReferentielStore);
  private readonly traitement = inject(TraitementContext);

  /** Code de l'entité réceptrice de l'utilisateur, vide s'il ne réceptionne pas. */
  readonly recepCode = computed(() => {
    this.referentiel.value();
    const account = this.session.account();
    if (account?.role === 'accueil') {
      return entityCode(account.entity);
    }
    if (account?.role === 'traitement') {
      const entite = entiteOf(this.traitement.entite());
      return entite?.recep ? entite.code : '';
    }
    return '';
  });

  readonly canReceive = computed(() => !!this.recepCode());

  /** Signature d'un pointage : l'agent d'accueil, ou le membre incarné côté traitement. */
  readonly by = computed(() =>
    this.session.role() === 'traitement'
      ? this.traitement.user()
      : (this.session.account()?.name ?? ''),
  );

  /** États destinés à l'entité réceptrice (lus dans l'API par `load()`). */
  readonly etats = this.reception.etats;

  /** Charge les états de l'entité réceptrice ; une erreur est déjà signalée par l'intercepteur. */
  load(): void {
    void this.reception.load().catch(() => undefined);
  }

  /** Dossiers réceptionnés par l'entité, quelle que soit leur entité de traitement. */
  readonly dossiers = computed(() => {
    const mine = new Set(this.etats().map((etat) => etat.ref));
    return this.store.dossiers().filter((dossier) => mine.has(dossier.etat));
  });
}
