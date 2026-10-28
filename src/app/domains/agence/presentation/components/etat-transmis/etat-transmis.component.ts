import { Component, computed, input, output } from '@angular/core';
import { formatStamp } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { entityOfDossier, entitySummary, shortEntity } from '../../../../dossiers/domain/routing';

/**
 * Confirmation affichée après la transmission, avec son récapitulatif. Un envoi peut produire
 * plusieurs états (un par type d'état) : chacun a sa référence et son bordereau.
 */
@Component({
  selector: 'app-etat-transmis',
  imports: [IconComponent],
  templateUrl: './etat-transmis.component.html',
})
export class EtatTransmisComponent {
  readonly etats = input.required<readonly Etat[]>();
  /** Compte rendu de l'envoi : état(s) produit(s) et leur entité réceptrice. */
  readonly line = input.required<string>();

  readonly newEtat = output<void>();
  /** Référence de l'état dont imprimer le bordereau. */
  readonly print = output<string>();

  protected readonly etat = computed(() => this.etats()[0]);
  private readonly dossiers = computed(() => this.etats().flatMap((etat) => etat.dossiers));
  protected readonly sentAt = computed(() => formatStamp(this.etat().sentAt));
  protected readonly entities = computed(() => entitySummary(this.dossiers()));
  protected readonly rows = computed(() =>
    this.dossiers().map((dossier, index) => ({
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
