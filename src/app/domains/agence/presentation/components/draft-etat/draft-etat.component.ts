import { Component, computed, inject, signal } from '@angular/core';
import { formatDateTime } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ACCUEIL_CENTRAL, Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { DossierDetailsComponent } from '../../../../dossiers/presentation/components/dossier-details/dossier-details.component';
import { CreerEtatFacade } from '../../creer-etat.facade';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** État en cours de constitution : en-tête, dossiers ajoutés et transmission. */
@Component({
  selector: 'app-draft-etat',
  imports: [IconComponent, DossierDetailsComponent],
  host: { class: 'block' },
  templateUrl: './draft-etat.component.html',
})
export class DraftEtatComponent {
  protected readonly facade = inject(CreerEtatFacade);

  protected readonly destination = ACCUEIL_CENTRAL;
  protected readonly priorityText = PRIORITY_TEXT;

  private readonly expanded = signal<ReadonlySet<number>>(new Set());

  protected readonly createdLabel = computed(() =>
    this.facade.draftCreatedAt()
      ? formatDateTime(this.facade.draftCreatedAt())
      : "À l'ajout du 1er dossier",
  );

  protected readonly allExpanded = computed(() => {
    const draft = this.facade.draft();
    return draft.length > 0 && draft.every((dossier) => this.expanded().has(dossier.id));
  });

  protected isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  protected toggle(id: number): void {
    this.expanded.update((expanded) => {
      const next = new Set(expanded);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.expanded.set(
      this.allExpanded() ? new Set() : new Set(this.facade.draft().map((dossier) => dossier.id)),
    );
  }
}
