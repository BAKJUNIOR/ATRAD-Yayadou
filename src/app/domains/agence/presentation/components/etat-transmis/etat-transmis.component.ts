import { Component, computed, input, output } from '@angular/core';
import { formatDateTime } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { entityOfDossier, entitySummary, shortEntity } from '../../../../dossiers/domain/routing';

/** Confirmation affichée après la transmission d'un état, avec son récapitulatif. */
@Component({
  selector: 'app-etat-transmis',
  imports: [IconComponent],
  templateUrl: './etat-transmis.component.html',
})
export class EtatTransmisComponent {
  readonly etat = input.required<Etat>();

  readonly newEtat = output<void>();
  readonly print = output<void>();

  protected readonly sentAt = computed(() => formatDateTime(this.etat().sentAt));
  protected readonly entities = computed(() => entitySummary(this.etat().dossiers));
  protected readonly rows = computed(() =>
    this.etat().dossiers.map((dossier, index) => ({
      n: index + 1,
      ref: dossier.ref,
      client: dossier.client,
      num: dossier.num,
      type: dossier.type,
      produit: dossier.produit,
      entite: shortEntity(entityOfDossier(dossier)),
    })),
  );
}
