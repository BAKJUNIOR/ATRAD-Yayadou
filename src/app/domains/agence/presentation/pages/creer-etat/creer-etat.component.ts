import { Component, inject } from '@angular/core';
import { DossierFormComponent } from '../../components/dossier-form/dossier-form.component';
import { DraftEtatComponent } from '../../components/draft-etat/draft-etat.component';
import { EtatTransmisComponent } from '../../components/etat-transmis/etat-transmis.component';
import { CreerEtatFacade } from '../../creer-etat.facade';

/** Parcours agence : saisir des dossiers, constituer un état puis le transmettre à son entité réceptrice. */
@Component({
  selector: 'app-creer-etat',
  imports: [DossierFormComponent, DraftEtatComponent, EtatTransmisComponent],
  providers: [CreerEtatFacade],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
  template: `
    @if (facade.sentEtats().length) {
      <app-etat-transmis
        [etats]="facade.sentEtats()"
        [line]="facade.sentLine()"
        (newEtat)="facade.startNewEtat()"
        (print)="facade.printEtat($event)"
      />
    } @else {
      <div class="flex animate-enter flex-wrap items-start gap-[18px]">
        <app-dossier-form class="block min-w-0 flex-[1_1_300px]" />
        <app-draft-etat class="min-w-0 flex-[1.7_1_300px] lg:sticky lg:top-[84px]" />
      </div>
    }
  `,
})
export class CreerEtatComponent {
  protected readonly facade = inject(CreerEtatFacade);

  /** Appelé par le garde de sortie de la route. */
  canLeave(): Promise<boolean> {
    return this.facade.confirmLeave();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.facade.unsavedMessage()) {
      event.preventDefault();
    }
  }
}
