import { Component, computed, inject } from '@angular/core';
import { formatDateTime } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { CreerEtatFacade } from '../../creer-etat.facade';

@Component({
  selector: 'app-draft-etat',
  imports: [IconComponent],
  host: { class: 'block' },
  templateUrl: './draft-etat.component.html',
})
export class DraftEtatComponent {
  protected readonly facade = inject(CreerEtatFacade);

  protected readonly createdLabel = computed(() =>
    this.facade.draftCreatedAt() ? formatDateTime(this.facade.draftCreatedAt()) : '—',
  );
}
