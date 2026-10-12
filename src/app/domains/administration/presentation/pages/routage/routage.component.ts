import { Component, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { entityCode } from '../../../../../core/utils/text.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { DOSSIER_TYPES, DossierType } from '../../../../dossiers/domain/dossier-catalog';
import {
  ALL_GESTIONNAIRES,
  AssignmentMode,
  ENTITES,
  EntitySettings,
  MODES,
  rightsOf,
  shortEntity,
} from '../../../../dossiers/domain/routing';
import { RoutingStore } from '../../../../dossiers/infrastructure/store/routing.store';

type Tab = 'map' | 'rep';

function modeLabel(mode: AssignmentMode): string {
  return MODES.find((candidate) => candidate.id === mode)?.label ?? mode;
}

/** Erreur de paramétrage d'une entité en mode répartiteur sans répartiteur désigné. */
function dispatcherError(settings: EntitySettings): string {
  return settings.mode === 'disp' && !settings.dispatchers.length
    ? 'Mode « Via un répartiteur » : désignez au moins une personne dans « Qui répartit ? ».'
    : '';
}

/** Garde les listes dérivées de l'équipe cohérentes avec elle, dans l'ordre du référentiel. */
function normalise(settings: EntitySettings): EntitySettings {
  const team = ALL_GESTIONNAIRES.filter((member) => settings.team.includes(member));
  return {
    ...settings,
    team,
    dispatchers: team.filter((member) => settings.dispatchers.includes(member)),
    searchers: team.filter((member) => settings.searchers.includes(member)),
  };
}

/** Administration : entité de chaque type de dossier, et répartition interne de chaque entité. */
@Component({
  selector: 'app-routage',
  imports: [IconComponent],
  templateUrl: './routage.component.html',
})
export class RoutageComponent {
  private readonly routing = inject(RoutingStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly entites = ENTITES;
  protected readonly modes = MODES;
  protected readonly modeLabel = modeLabel;

  protected readonly tab = signal<Tab>('map');
  /** Ligne « type → entité » en cours de modification. */
  protected readonly mapEdit = signal<{ type: DossierType; value: string } | null>(null);
  private readonly selectedEntite = signal(ENTITES[0].name);
  /** Réglages modifiés de l'entité affichée, tant qu'ils ne sont pas enregistrés. */
  private readonly entDraft = signal<EntitySettings | null>(null);

  private readonly saved = this.routing.config;

  // ------------------------------------------------ Type de dossier → entité

  protected readonly typeRows = computed(() => {
    const edit = this.mapEdit();
    return DOSSIER_TYPES.map((type) => {
      const value = this.saved().map[type] ?? '';
      const editing = edit?.type === type;
      const target = editing ? this.saved().ent[edit.value] : undefined;
      const error =
        target && !target.team.length
          ? `${shortEntity(edit!.value)} n'a aucun gestionnaire : complétez d'abord son équipe dans l'onglet « Répartition interne par entité ».`
          : '';
      return {
        type,
        value,
        editing,
        locked: !!edit && !editing,
        changed: editing && edit.value !== value,
        error,
      };
    });
  });

  protected startMapEdit(type: DossierType): void {
    if (!this.mapEdit()) {
      this.mapEdit.set({ type, value: this.saved().map[type] ?? '' });
    }
  }

  protected onMapValue(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.mapEdit.update((edit) => (edit ? { ...edit, value } : edit));
  }

  protected async saveMapEdit(): Promise<void> {
    const edit = this.mapEdit();
    const current = edit ? this.saved().map[edit.type] : '';
    if (!edit || edit.value === current) {
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Modifier le routage de « ${edit.type} » ?`,
      text: `${edit.type} : ${current} → ${edit.value}. Seule cette ligne est modifiée. Le changement s'applique aux prochaines réceptions ; les dossiers déjà routés ne bougent pas.`,
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    const config = structuredClone(this.saved());
    config.map[edit.type] = edit.value;
    this.routing.save(config);
    this.mapEdit.set(null);
    this.toast.success(`Routage de « ${edit.type} » enregistré.`);
  }

  // ------------------------------------------- Répartition interne par entité

  protected readonly entite = this.selectedEntite.asReadonly();
  private readonly settings = computed(
    () => this.entDraft() ?? this.saved().ent[this.selectedEntite()],
  );
  protected readonly dirty = computed(() => {
    const draft = this.entDraft();
    return (
      !!draft && JSON.stringify(draft) !== JSON.stringify(this.saved().ent[this.selectedEntite()])
    );
  });

  protected readonly entityList = computed(() =>
    ENTITES.map((entite) => {
      const selected = entite.name === this.selectedEntite();
      const settings = selected ? this.settings() : this.saved().ent[entite.name];
      const types = DOSSIER_TYPES.filter((type) => this.saved().map[type] === entite.name);
      let note = '';
      let noteClass = 'text-ink-faint';
      if (dispatcherError(settings)) {
        note = 'Aucun répartiteur désigné';
        noteClass = 'text-danger';
      } else if (!settings.team.length && types.length) {
        note = 'Équipe vide';
        noteClass = 'text-danger';
      } else if (selected && this.dirty()) {
        note = 'Modifications non enregistrées';
        noteClass = 'text-warning';
      } else if (!types.length) {
        note = 'Aucun type rattaché';
      }
      return {
        name: entite.name,
        short: entite.short,
        code: entityCode(entite.name),
        mode: modeLabel(settings.mode),
        team: `${settings.team.length} membre${settings.team.length > 1 ? 's' : ''}`,
        selected,
        note,
        noteClass,
      };
    }),
  );

  protected readonly detail = computed(() => {
    const settings = this.settings();
    const isDisp = settings.mode === 'disp';
    const error = !settings.team.length
      ? "Équipe vide : cochez au moins un membre dans « Équipe de l'entité »."
      : dispatcherError(settings);
    return {
      settings,
      isDisp,
      error: this.dirty() || isDisp ? error : '',
      types: DOSSIER_TYPES.filter((type) => this.saved().map[type] === this.selectedEntite()),
      teamLabel: `${settings.team.length} membre${settings.team.length > 1 ? 's' : ''} sur ${ALL_GESTIONNAIRES.length}`,
      dispatcherCount: settings.dispatchers.length
        ? `${settings.dispatchers.length} désigné${settings.dispatchers.length > 1 ? 's' : ''}`
        : 'obligatoire',
      gridClass: isDisp ? 'members-grid-disp min-w-[480px]' : 'members-grid min-w-[380px]',
      members: ALL_GESTIONNAIRES.map((name) => {
        const inTeam = settings.team.includes(name);
        return {
          name,
          inTeam,
          dispatcher: settings.dispatchers.includes(name),
          searcher: settings.searchers.includes(name),
          rights: inTeam ? rightsOf(name, settings) : [],
        };
      }),
    };
  });

  protected async selectEntite(name: string): Promise<void> {
    if (name !== this.selectedEntite() && (await this.confirmDiscard())) {
      this.selectedEntite.set(name);
      this.entDraft.set(null);
    }
  }

  protected setMode(mode: AssignmentMode): void {
    this.edit((settings) => ({ ...settings, mode }));
  }

  protected toggleMember(name: string): void {
    this.edit((settings) => ({ ...settings, team: this.flip(settings.team, name) }));
  }

  protected toggleDispatcher(name: string): void {
    this.edit((settings) => ({ ...settings, dispatchers: this.flip(settings.dispatchers, name) }));
  }

  protected toggleSearcher(name: string): void {
    this.edit((settings) => ({ ...settings, searchers: this.flip(settings.searchers, name) }));
  }

  protected cancelEntEdit(): void {
    this.entDraft.set(null);
  }

  protected async saveEntEdit(): Promise<void> {
    const draft = this.entDraft();
    const name = this.selectedEntite();
    if (!draft || !this.dirty() || this.detail().error) {
      return;
    }
    const before = this.saved().ent[name];
    const changes: string[] = [];
    if (before.mode !== draft.mode) {
      changes.push(`mode : ${modeLabel(before.mode)} → ${modeLabel(draft.mode)}`);
    }
    const added = draft.team.filter((member) => !before.team.includes(member));
    const removed = before.team.filter((member) => !draft.team.includes(member));
    if (added.length) {
      changes.push(`ajout à l'équipe : ${added.join(', ')}`);
    }
    if (removed.length) {
      changes.push(`retrait de l'équipe : ${removed.join(', ')}`);
    }
    if (draft.mode === 'disp' && before.dispatchers.join() !== draft.dispatchers.join()) {
      changes.push(`répartiteur(s) : ${draft.dispatchers.join(', ')}`);
    }
    const canSearch = draft.searchers.filter((member) => !before.searchers.includes(member));
    const noSearch = before.searchers.filter(
      (member) => !draft.searchers.includes(member) && draft.team.includes(member),
    );
    if (canSearch.length) {
      changes.push(`peut rechercher : ${canSearch.join(', ')}`);
    }
    if (noSearch.length) {
      changes.push(`ne peut plus rechercher : ${noSearch.join(', ')}`);
    }
    const rights = draft.team
      .map(
        (member) =>
          `${member} : ${rightsOf(member, draft).join(' · ')}${draft.searchers.includes(member) ? ' + Rechercher' : ''}`,
      )
      .join(' ; ');

    const confirmed = await this.confirm.ask({
      title: `Enregistrer « ${shortEntity(name)} » ?`,
      text:
        `Changements : ${changes.join(' ; ') || '—'}. Droits appliqués : ${rights}.` +
        (removed.length ? ` ${removed.join(', ')} perd(ent) ses droits dans cette entité.` : '') +
        ' Seule cette entité est modifiée.',
      okLabel: 'Enregistrer',
    });
    if (!confirmed) {
      return;
    }
    const config = structuredClone(this.saved());
    config.ent[name] = draft;
    this.routing.save(config);
    this.entDraft.set(null);
    this.toast.success(`Répartition de ${shortEntity(name)} enregistrée.`);
  }

  // ----------------------------------------------------- Onglets et sortie

  protected async pickTab(tab: Tab): Promise<void> {
    if (tab !== this.tab() && (await this.confirmDiscard())) {
      this.tab.set(tab);
      this.mapEdit.set(null);
      this.entDraft.set(null);
    }
  }

  /** Appelé par le garde de sortie de la route. */
  canLeave(): Promise<boolean> {
    return this.confirmDiscard();
  }

  private hasUnsaved(): boolean {
    const edit = this.mapEdit();
    return this.dirty() || (!!edit && edit.value !== this.saved().map[edit.type]);
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.hasUnsaved()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: 'Le paramétrage du routage a été modifié mais pas enregistré. Si vous quittez cet écran, cette saisie sera perdue.',
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }

  private edit(change: (settings: EntitySettings) => EntitySettings): void {
    this.entDraft.set(normalise(change(structuredClone(this.settings()))));
  }

  private flip(list: readonly string[], name: string): string[] {
    return list.includes(name) ? list.filter((member) => member !== name) : [...list, name];
  }
}
