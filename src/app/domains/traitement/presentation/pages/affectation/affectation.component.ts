import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { StatCardComponent } from '../../../../../shared/ui/stat-card/stat-card.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { TraitementStore } from '../../../infrastructure/store/traitement.store';
import { TraitementContext } from '../../traitement-context.service';

const NOT_ASSIGNED = 'Non affecté';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** Parcours traitement (répartiteur) : attribuer les dossiers du bac aux membres de l'entité. */
@Component({
  selector: 'app-affectation',
  imports: [RouterLink, StatCardComponent],
  templateUrl: './affectation.component.html',
})
export class AffectationComponent {
  private readonly store = inject(TraitementStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly context = inject(TraitementContext);

  protected readonly notAssigned = NOT_ASSIGNED;
  protected readonly priorityText = PRIORITY_TEXT;

  /** Gestionnaire choisi pour chaque dossier du bac, avant confirmation. */
  private readonly picks = signal<Record<string, string>>({});

  /** Bac du répartiteur : dossiers reçus sans gestionnaire, lus dans l'API. */
  protected readonly rows = this.context.bacDossiers;
  private readonly active = computed(() =>
    this.context.entityDossiers().filter((dossier) => dossier.gest && dossier.status !== 'Clôturé'),
  );

  protected readonly activeCount = computed(() => this.active().length);

  protected readonly pendingLabel = computed(() =>
    this.rows().length
      ? `${this.rows().length} dossier(s) sans gestionnaire`
      : 'Tous les dossiers sont affectés',
  );

  protected readonly load = computed(() => {
    const counts = this.context.team().map((name) => ({
      name,
      n: this.active().filter((dossier) => dossier.gest === name).length,
    }));
    const max = Math.max(1, ...counts.map((entry) => entry.n));
    return counts.map((entry) => ({
      ...entry,
      width: `${Math.round((entry.n / max) * 100)}%`,
      // Le gestionnaire le plus chargé ressort en couleur de titre.
      barClass: entry.n > 0 && entry.n >= max ? 'bg-heading' : 'bg-brand-mid',
      hint: entry.n ? `${entry.n} dossier(s) en cours` : 'Aucun dossier en cours',
    }));
  });

  protected pickOf(dossier: RoutedDossier): string {
    return this.picks()[dossier.id] ?? NOT_ASSIGNED;
  }

  protected onPick(dossier: RoutedDossier, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.picks.update((picks) => ({ ...picks, [dossier.id]: value }));
  }

  protected async assign(dossier: RoutedDossier): Promise<void> {
    const gestionnaire = this.pickOf(dossier);
    if (gestionnaire === NOT_ASSIGNED) {
      this.toast.warning(`Choisissez d'abord la personne à qui affecter ${dossier.ref}.`);
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Affecter ${dossier.ref} à ${gestionnaire} ?`,
      text: `Le dossier quitte le bac et apparaît dans « Mes dossiers » de ${gestionnaire}. L'opération est horodatée.`,
      okLabel: 'Affecter',
    });
    if (!confirmed) {
      return;
    }
    try {
      await this.store.assign(dossier.id, gestionnaire);
    } catch {
      return;
    }
    this.toast.success(`Dossier ${dossier.ref} affecté à ${gestionnaire}.`);
  }
}
