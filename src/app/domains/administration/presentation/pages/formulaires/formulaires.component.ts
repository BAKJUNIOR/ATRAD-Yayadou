import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { ReferentielStore } from '../../../../dossiers/infrastructure/store/referentiel.store';
import {
  CHAMP_KINDS,
  COMPTES_CHOIX,
  ChampDraft,
  ChampKind,
  FORMATS_PIECE,
  FormulaireDraft,
  PieceDraft,
  TAILLES_PIECE,
  UNITES,
  draftFromApi,
  formulaireErrors,
  newChamp,
  newPiece,
  requestOf,
  sameFormulaire,
} from '../../../domain/formulaire';
import { AdministrationApi } from '../../../infrastructure/api/administration.api';

@Component({
  selector: 'app-formulaires',
  imports: [IconComponent],
  templateUrl: './formulaires.component.html',
})
export class FormulairesComponent {
  private readonly referentiel = inject(ReferentielStore);
  private readonly api = inject(AdministrationApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly kinds = CHAMP_KINDS;
  protected readonly unites = UNITES;
  protected readonly comptesChoix = COMPTES_CHOIX;
  protected readonly formats = FORMATS_PIECE;
  protected readonly tailles = TAILLES_PIECE;

  protected readonly types = computed(() =>
    Object.entries(this.referentiel.value().typeIds)
      .map(([nom, id]) => ({ nom, id }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  );

  protected readonly selected = signal<{ nom: string; id: string } | null>(null);
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  private readonly original = signal<FormulaireDraft | null>(null);
  protected readonly draft = signal<FormulaireDraft | null>(null);

  protected readonly errors = computed(() => {
    const draft = this.draft();
    return draft ? formulaireErrors(draft) : [];
  });

  protected readonly dirty = computed(() => {
    const draft = this.draft();
    const original = this.original();
    return !!draft && !!original && !sameFormulaire(draft, original);
  });

  protected readonly canSave = computed(
    () => this.dirty() && !this.errors().length && !this.busy(),
  );

  protected async pick(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const type = this.types().find((candidate) => candidate.id === select.value) ?? null;
    if (!(await this.canLeave())) {
      select.value = this.selected()?.id ?? '';
      return;
    }
    this.selected.set(type);
    this.draft.set(null);
    this.original.set(null);
    if (type) {
      await this.load(type.id);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const draft = draftFromApi(await firstValueFrom(this.api.formulaire(id)));
      this.original.set(draft);
      this.draft.set(structuredClone(draft));
    } catch {
      this.selected.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private updateChamp(key: number, change: Partial<ChampDraft>): void {
    this.draft.update((draft) =>
      draft
        ? {
            ...draft,
            champs: draft.champs.map((champ) =>
              champ.key === key ? { ...champ, ...change } : champ,
            ),
          }
        : draft,
    );
  }

  protected setLibelle(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { libelle: (event.target as HTMLInputElement).value });
  }

  protected setKind(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { kind: (event.target as HTMLSelectElement).value as ChampKind });
  }

  protected setUnite(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { unite: (event.target as HTMLSelectElement).value });
  }

  protected setObligatoire(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { obligatoire: (event.target as HTMLInputElement).checked });
  }

  protected setEnTete(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { enTete: (event.target as HTMLInputElement).checked });
  }

  protected setNumeroClient(event: Event): void {
    const numeroClient = (event.target as HTMLInputElement).checked;
    this.draft.update((draft) => (draft ? { ...draft, numeroClient } : draft));
  }

  protected setComptes(event: Event): void {
    const comptes = (event.target as HTMLSelectElement).value;
    this.draft.update((draft) => (draft ? { ...draft, comptes } : draft));
  }

  protected setValeurs(champ: ChampDraft, event: Event): void {
    this.updateChamp(champ.key, { valeurs: (event.target as HTMLTextAreaElement).value });
  }

  protected addChamp(): void {
    this.draft.update((draft) =>
      draft ? { ...draft, champs: [...draft.champs, newChamp()] } : draft,
    );
  }

  protected removeChamp(champ: ChampDraft): void {
    this.draft.update((draft) =>
      draft ? { ...draft, champs: draft.champs.filter((c) => c.key !== champ.key) } : draft,
    );
  }

  protected move(index: number, offset: -1 | 1): void {
    this.draft.update((draft) => {
      if (!draft) {
        return draft;
      }
      const champs = [...draft.champs];
      const target = index + offset;
      if (target < 0 || target >= champs.length) {
        return draft;
      }
      [champs[index], champs[target]] = [champs[target], champs[index]];
      return { ...draft, champs };
    });
  }

  private updatePiece(index: number, change: Partial<PieceDraft>): void {
    this.draft.update((draft) =>
      draft
        ? {
            ...draft,
            pieces: draft.pieces.map((piece, i) => (i === index ? { ...piece, ...change } : piece)),
          }
        : draft,
    );
  }

  protected setPiece(index: number, event: Event): void {
    this.updatePiece(index, { libelle: (event.target as HTMLInputElement).value });
  }

  protected setPieceObligatoire(index: number, event: Event): void {
    this.updatePiece(index, { obligatoire: (event.target as HTMLInputElement).checked });
  }

  protected setPieceAJoindre(index: number, event: Event): void {
    this.updatePiece(index, { aJoindre: (event.target as HTMLInputElement).checked });
  }

  protected togglePieceFormat(index: number, piece: PieceDraft, format: string): void {
    const formats = piece.formats.includes(format)
      ? piece.formats.filter((candidate) => candidate !== format)
      : [...piece.formats, format];
    this.updatePiece(index, { formats });
  }

  protected setPieceTaille(index: number, event: Event): void {
    this.updatePiece(index, { tailleMaxKo: Number((event.target as HTMLSelectElement).value) });
  }

  protected addPiece(): void {
    this.draft.update((draft) =>
      draft ? { ...draft, pieces: [...draft.pieces, newPiece()] } : draft,
    );
  }

  protected removePiece(index: number): void {
    this.draft.update((draft) =>
      draft ? { ...draft, pieces: draft.pieces.filter((_, i) => i !== index) } : draft,
    );
  }

  protected cancel(): void {
    const original = this.original();
    this.draft.set(original ? structuredClone(original) : null);
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    const type = this.selected();
    if (!draft || !type || !this.canSave()) {
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Enregistrer le formulaire « ${type.nom} » ?`,
      text: `${draft.champs.length} champ(s) et ${requestOf(draft).pieces.length} pièce(s) attendue(s). S'applique aux prochains dossiers saisis ; les dossiers déjà saisis gardent leurs informations.`,
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(true);
    try {
      const saved = draftFromApi(
        await firstValueFrom(this.api.modifierFormulaire(type.id, requestOf(draft))),
      );
      this.original.set(saved);
      this.draft.set(structuredClone(saved));
      await this.referentiel.refresh();
      this.toast.success(`Formulaire « ${type.nom} » enregistré.`);
    } catch {
      return;
    } finally {
      this.busy.set(false);
    }
  }

  async canLeave(): Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: `Le formulaire « ${this.selected()?.nom} » a été modifié mais pas enregistré. Ces modifications seront perdues.`,
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }
}
