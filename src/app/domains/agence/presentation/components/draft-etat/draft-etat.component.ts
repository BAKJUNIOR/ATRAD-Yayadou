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

  protected onEtatType(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const previous = this.facade.etatType()?.id ?? '';
    void this.facade.setEtatType(select.value).then(() => {
      // Changement refusé : la liste revient au type d'état conservé.
      select.value = this.facade.etatType()?.id ?? previous;
    });
  }
}
