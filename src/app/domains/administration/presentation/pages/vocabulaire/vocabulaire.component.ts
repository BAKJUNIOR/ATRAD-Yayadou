import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { DEFAULT_VOCABULARY, Vocabulary } from '../../../../dossiers/domain/referentiel';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';

/** Administration : libellés du tiers concerné et du dossier, appliqués à toute l'application. */
@Component({
  selector: 'app-vocabulaire',
  templateUrl: './vocabulaire.component.html',
})
export class VocabulaireComponent {
  private readonly referentiel = inject(ReferentielStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  private readonly saved = computed(() => this.referentiel.value().vocab);
  /** Saisie en cours ; `null` tant que rien n'a été modifié. */
  private readonly edited = signal<Vocabulary | null>(null);

  protected readonly value = computed(() => this.edited() ?? this.saved());
  protected readonly dirty = computed(
    () => JSON.stringify(this.value()) !== JSON.stringify(this.saved()),
  );
  protected readonly error = computed(() => {
    const { tiers, dossier } = this.value();
    if (!tiers.trim()) {
      return 'Le libellé du tiers concerné est obligatoire.';
    }
    return dossier.trim() ? '' : 'Le libellé du dossier est obligatoire.';
  });
  protected readonly canSave = computed(() => this.dirty() && !this.error());
  protected readonly hint = computed(() =>
    !this.dirty() ? 'Aucune modification' : this.error() || 'Modifications non enregistrées',
  );
  protected readonly preview = computed(() => {
    const { tiers, dossier } = this.value();
    return `Ex. : « ${tiers} concerné » · « Nouveau ${dossier.toLowerCase()} à transmettre »`;
  });

  protected set(key: keyof Vocabulary, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.edited.set({ ...this.value(), [key]: text });
  }

  protected restoreDefaults(): void {
    this.edited.set({ ...DEFAULT_VOCABULARY });
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }
    const tiers = this.value().tiers.trim();
    const dossier = this.value().dossier.trim();
    const confirmed = await this.confirm.ask({
      title: 'Enregistrer le vocabulaire ?',
      text: `« ${tiers} » et « ${dossier} » remplaceront les libellés actuels dans les formulaires, tableaux, bordereaux et messages.`,
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    this.referentiel.save({ vocab: { tiers, dossier } });
    this.edited.set(null);
    this.toast.success('Vocabulaire enregistré.');
  }

  /** Appelé par le garde de sortie de la route. */
  async canLeave(): Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: 'Le vocabulaire a été modifié mais pas enregistré. Si vous quittez cet écran, cette saisie sera perdue.',
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }
}
