import { Component, computed, input, output } from '@angular/core';
import { formatStamp } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { Etat } from '../../../../dossiers/domain/entities/etat.entity';
import { entitySummary } from '../../../../dossiers/domain/routing';

@Component({
  selector: 'app-etat-transmis',
  imports: [IconComponent],
  templateUrl: './etat-transmis.component.html',
})
export class EtatTransmisComponent {
  readonly etats = input.required<readonly Etat[]>();
  readonly line = input.required<string>();

  readonly newEtat = output<void>();
  readonly print = output<string>();

  protected readonly etat = computed(() => this.etats()[0]);
  private readonly dossiers = computed(() => this.etats().flatMap((etat) => etat.dossiers));
  protected readonly sentAt = computed(() => formatStamp(this.etat().sentAt));
  protected readonly entities = computed(() => entitySummary(this.dossiers()));
}
