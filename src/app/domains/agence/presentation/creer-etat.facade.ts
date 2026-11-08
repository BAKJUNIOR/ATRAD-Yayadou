import { Injectable, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { nowIso, todayIsoDate } from '../../../core/utils/date.util';
import {
  DOSSIER_FORM,
  DossierType,
  fieldsOf,
  produitsOf,
} from '../../dossiers/domain/dossier-catalog';
import { Dossier, PieceJointe } from '../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../dossiers/domain/entities/etat.entity';
import { screenPieces } from '../../dossiers/domain/piece.rules';
import {
  allowedTypes,
  currentEtatType,
  draftGroups,
  entityCode,
  entityLabel,
  etatTypeOfDossier,
  etatTypesFor,
} from '../../dossiers/domain/referentiel';
import { entityOf, entitySummary } from '../../dossiers/domain/routing';
import { ReferentielStore } from '../../dossiers/infrastructure/store/referentiel.store';
import { BordereauService } from '../../dossiers/presentation/bordereau.service';
import { BrouillonStore } from '../infrastructure/store/brouillon.store';
import {
  BASE_FIELD_KEYS,
  BaseFieldKey,
  DossierFormValue,
  buildDossierData,
  changedLabels,
  emptyDossierForm,
  fieldError,
  filterAccountInput,
  filterClientInput,
  formSnapshot,
  formValueOf,
  hasTypedContent,
} from '../domain/dossier-form.rules';

type TextFieldKey = BaseFieldKey | 'note';

const TYPE_SEARCH_THRESHOLD = 15;

@Injectable()
export class CreerEtatFacade {
  private readonly store = inject(BrouillonStore);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly bordereau = inject(BordereauService);
  private readonly referentiel = inject(ReferentielStore);

  readonly labels = DOSSIER_FORM;

  private readonly emetCode = computed(() => entityCode(this.session.account()?.entity ?? ''));
  readonly autoMode = computed(() => this.referentiel.value().saisieMode === 'auto');
  readonly etatTypes = computed(() => {
    this.referentiel.value();
    return etatTypesFor(this.emetCode());
  });
  private readonly etatTypeChoice = signal(
    etatTypeOfDossier(this.store.draft()[0]?.type ?? '')?.id ?? '',
  );
  readonly etatType = computed(() => {
    this.referentiel.value();
    return currentEtatType(this.emetCode(), this.etatTypeChoice()) ?? null;
  });
  readonly editId = signal<string | null>(null);
  readonly allowed = computed(() => {
    this.referentiel.value();
    return allowedTypes(this.emetCode(), this.etatType()?.id ?? '');
  });
  readonly typeQuery = signal('');
  readonly typeSearchOn = computed(() => this.allowed().length > TYPE_SEARCH_THRESHOLD);
  readonly typeOptions = computed(() => {
    const all = this.allowed();
    const query = this.typeQuery().trim().toLowerCase();
    if (!query) {
      return all;
    }
    const type = this.value().type;
    const found = all.filter((candidate) => candidate.toLowerCase().includes(query));
    return found.includes(type) || !all.includes(type) ? found : [type, ...found];
  });

  readonly value = signal<DossierFormValue>(emptyDossierForm(this.allowed()[0] ?? ''));
  readonly errors = signal<Record<string, string>>({});
  readonly touched = signal(false);
  readonly formError = signal('');
  readonly pieces = signal<PieceJointe[]>([]);
  readonly pieceError = signal('');

  readonly editOriginalType = signal<DossierType | null>(null);
  private editSnapshot = '';

  /**
   * Dossiers de l'état en cours. En mode « choix », seuls ceux du type d'état choisi : les autres restent dans le
   * brouillon (`waiting`) et reviennent quand l'agent rechoisit leur type d'état.
   */
  readonly draft = computed(() => {
    this.referentiel.value();
    const all = this.store.draft();
    const etatTypeId = this.etatType()?.id;
    return this.autoMode()
      ? all
      : all.filter((dossier) => etatTypeOfDossier(dossier.type)?.id === etatTypeId);
  });
  readonly waitingGroups = computed(() => {
    const shown = new Set(this.draft().map((dossier) => dossier.id));
    const groups = new Map<string, { id: string; nom: string; count: number }>();
    for (const dossier of this.store.draft()) {
      const etatType = etatTypeOfDossier(dossier.type);
      if (!shown.has(dossier.id) && etatType) {
        const group = groups.get(etatType.id) ?? { id: etatType.id, nom: etatType.nom, count: 0 };
        group.count++;
        groups.set(etatType.id, group);
      }
    }
    return [...groups.values()];
  });
  readonly waiting = computed(() => {
    const shown = new Set(this.draft().map((dossier) => dossier.id));
    const counts = new Map<string, number>();
    for (const dossier of this.store.draft()) {
      if (!shown.has(dossier.id)) {
        const nom = etatTypeOfDossier(dossier.type)?.nom ?? 'Sans type d’état';
        counts.set(nom, (counts.get(nom) ?? 0) + 1);
      }
    }
    return [...counts].map(([nom, count]) => `« ${nom} » (${count})`).join(', ');
  });
  readonly draftCreatedAt = this.store.draftCreatedAt;
  readonly busy = signal(false);

  readonly sentEtats = signal<readonly Etat[]>([]);
  readonly sentEtat = computed(() => this.sentEtats()[0] ?? null);
  readonly editing = computed(
    () => this.draft().find((dossier) => dossier.id === this.editId()) ?? null,
  );
  readonly typeFields = computed(() => fieldsOf(this.value().type));
  readonly plannedEntity = computed(() => entityOf(this.value().type));
  readonly draftEntities = computed(() => entitySummary(this.draft()));

  readonly groups = computed(() => {
    this.referentiel.value();
    return draftGroups(this.draft(), this.emetCode(), this.etatType()?.id ?? '');
  });

  readonly destinationLabel = computed(() => {
    if (this.autoMode()) {
      const count = this.groups().groups.length;
      return count ? `${count} état(s) seront générés` : "Générée à la validation, par type d'état";
    }
    const etatType = this.etatType();
    return etatType ? `${etatType.nom} · ${entityLabel(etatType.recep)}` : '—';
  });

  readonly etatTypeNames = computed(() => {
    const names = this.groups().groups.map(({ etatType }) => etatType.nom);
    return names.length ? names.join(', ') : (this.etatType()?.nom ?? '—');
  });

  private readonly groupsText = computed(() =>
    this.groups()
      .groups.map(
        ({ etatType, dossiers }) =>
          `${etatType.nom} → ${entityLabel(etatType.recep)} (${dossiers.length} dossier${dossiers.length > 1 ? 's' : ''})`,
      )
      .join(' · '),
  );

  readonly groupsLine = computed(() => {
    const count = this.groups().groups.length;
    return this.autoMode() && count > 1
      ? `Cet envoi produira ${count} état${count > 1 ? 's' : ''} : ${this.groupsText()}`
      : '';
  });

  readonly blockMessage = computed(() => {
    const { miss } = this.groups();
    return miss.length
      ? `Transmission impossible : ${miss.map((d) => `${d.ref} (${d.type})`).join(', ')} n'appartient à aucun type d'état autorisé pour votre entité. Modifiez ou retirez ce dossier.`
      : '';
  });

  readonly sentLine = computed(() => {
    const etats = this.sentEtats();
    if (etats.length > 1) {
      return `Cet envoi a produit ${etats.length} états : ${etats.map((etat) => `${etat.ref} (« ${etat.etTypeNom} », ${etat.dossiers.length} dossier(s)) → ${etat.dest}`).join(' · ')}.`;
    }
    const etat = etats[0];
    return etat
      ? `L'état ${etat.ref} (type « ${etat.etTypeNom} ») a été transmis à ${etat.dest}.`
      : '';
  });

  readonly editTypeWarning = computed(() => {
    const editing = this.editing();
    return !!editing && editing.type !== this.value().type && editing.extra.length > 0;
  });

  readonly agenceName = computed(() =>
    (this.session.account()?.entity ?? '').replace(/ \([^)]+\)$/, ''),
  );
  readonly agentName = computed(() => this.session.account()?.name ?? '');

  constructor() {
    void this.store.load().catch(() => undefined);
  }

  setText(key: TextFieldKey, raw: string): string {
    const text =
      key === 'client' ? filterClientInput(raw) : key === 'compte' ? filterAccountInput(raw) : raw;
    this.value.update((value) => ({ ...value, [key]: text }));
    this.formError.set('');
    this.revalidate(key, text);
    return text;
  }

  setExtra(key: string, raw: string): void {
    this.value.update((value) => ({ ...value, extra: { ...value.extra, [key]: raw } }));
    this.formError.set('');
    this.revalidate(key, raw);
  }

  patch(change: Partial<Pick<DossierFormValue, 'produit' | 'prio'>>): void {
    this.value.update((value) => ({ ...value, ...change }));
  }

  setTypeQuery(query: string): void {
    this.typeQuery.set(query);
    const found = this.allowed().filter((type) =>
      type.toLowerCase().includes(query.trim().toLowerCase()),
    );
    if (found.length && !found.includes(this.value().type)) {
      this.setType(found[0]);
    }
  }

  /**
   * Change de type d'état. Les dossiers déjà saisis restent dans le brouillon : seuls ceux du type d'état choisi
   * sont affichés et transmis. Une modification en cours est abandonnée.
   */
  async setEtatType(id: string): Promise<void> {
    const current = this.etatType();
    const next = this.etatTypes().find((etatType) => etatType.id === id);
    if (!next || id === current?.id) {
      return;
    }
    if (this.editId()) {
      this.clearForm(true);
    }
    this.etatTypeChoice.set(id);
    if (etatTypeOfDossier(this.value().type)?.id !== id) {
      this.setType(allowedTypes(this.emetCode(), id)[0] ?? '');
    }
    this.value.update((value) => ({ ...value, extra: {} }));
  }

  setType(type: DossierType): void {
    // Le produit suit le type : il reste s'il est proposé pour le nouveau type, sinon le premier est retenu.
    this.value.update((value) => {
      const produits = produitsOf(type);
      return {
        ...value,
        type,
        produit: produits.includes(value.produit) ? value.produit : (produits[0] ?? ''),
      };
    });
    this.errors.update((errors) =>
      Object.fromEntries(
        BASE_FIELD_KEYS.filter((key) => errors[key]).map((key) => [key, errors[key]]),
      ),
    );
    this.touched.set(false);
    this.formError.set('');
  }

  validateField(key: string): void {
    const value = this.value();
    const raw = BASE_FIELD_KEYS.includes(key as BaseFieldKey)
      ? value[key as BaseFieldKey]
      : (value.extra[key] ?? '');
    this.errors.update((errors) => ({
      ...errors,
      [key]: fieldError(key, raw, value.type, todayIsoDate()),
    }));
  }

  isInvalid(key: string): boolean {
    return !!this.errors()[key];
  }

  resetForm(): void {
    this.clearForm(true);
  }

  addPieces(fileList: FileList | null | undefined): void {
    const { accepted, errors } = screenPieces(Array.from(fileList ?? []), this.pieces());
    if (!accepted.length) {
      this.pieceError.set(errors.join(' · '));
      return;
    }
    const at = nowIso();
    const by = this.session.account()?.name ?? '';
    const added: PieceJointe[] = accepted.map((file) => ({
      id: `pj-${crypto.randomUUID()}`,
      file,
      name: file.name,
      size: file.size,
      mime: file.type,
      ext: (file.name.split('.').pop() ?? '').toUpperCase().replace('JPEG', 'JPG'),
      at,
      by,
    }));
    this.pieces.update((pieces) => [...pieces, ...added]);
    this.pieceError.set(errors.join(' · '));
  }

  /** Une pièce déjà envoyée n'est supprimée de l'API qu'à l'enregistrement du dossier. */
  removePiece(piece: PieceJointe): void {
    this.pieces.update((pieces) => pieces.filter((candidate) => candidate.id !== piece.id));
    this.pieceError.set('');
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.editId() !== null) {
      void this.saveEdit();
      return;
    }
    if (!this.allowed().includes(this.value().type)) {
      this.formError.set(
        `Le type de dossier « ${this.value().type} » n'est pas accepté par ${this.autoMode() ? "vos types d'état" : "le type d'état choisi"}.`,
      );
      return;
    }
    const result = buildDossierData(this.value(), this.pieces(), todayIsoDate());
    if (!result.ok) {
      this.showInvalid(result.error, result.errors);
      return;
    }
    const dossier = await this.run(() => this.store.add(result.data));
    if (!dossier) {
      return;
    }
    this.clearForm(false);
    this.toast.success(`Dossier ${dossier.ref} ajouté à l'état — statut Temporaire.`);
  }

  async startEdit(dossier: Dossier): Promise<void> {
    if (this.editId() === dossier.id || !(await this.confirmLeave())) {
      return;
    }
    this.value.set(formValueOf(dossier));
    this.pieces.set([...dossier.pieces]);
    this.errors.set({});
    this.touched.set(false);
    this.formError.set('');
    this.pieceError.set('');
    this.editId.set(dossier.id);
    this.editOriginalType.set(dossier.type);
    this.editSnapshot = formSnapshot(this.value(), this.pieces());
  }

  async cancelEdit(): Promise<void> {
    if (await this.confirmLeave()) {
      this.clearForm(true);
    }
  }

  private async saveEdit(): Promise<void> {
    const previous = this.editing();
    if (!previous) {
      this.clearForm(true);
      return;
    }
    const result = buildDossierData(this.value(), this.pieces(), todayIsoDate());
    if (!result.ok) {
      this.showInvalid(result.error, result.errors);
      return;
    }

    if (previous.type !== result.data.type && previous.extra.length) {
      const confirmed = await this.confirm.ask({
        title: 'Changer le type du dossier ?',
        text: `Le dossier passe de « ${previous.type} » à « ${result.data.type} ». Les informations propres à l'ancien type seront supprimées : ${previous.extra.map((extra) => extra.label).join(', ')}.`,
        okLabel: 'Changer le type et enregistrer',
        danger: true,
      });
      if (!confirmed) {
        return;
      }
    }

    const changes = changedLabels(previous, result.data);
    if (!changes.length) {
      this.toast.info('Aucune modification à enregistrer.');
      this.clearForm(true);
      return;
    }

    if (!(await this.run(() => this.store.update(previous, result.data)))) {
      return;
    }
    this.clearForm(true);
    this.toast.success(
      `Dossier ${previous.ref} modifié (${changes.length} champ${changes.length > 1 ? 's' : ''}) — référence inchangée.`,
    );
  }

  async remove(dossier: Dossier): Promise<void> {
    if (this.editId() === dossier.id) {
      this.toast.warning(
        `Terminez ou annulez la modification de ${dossier.ref} avant de le supprimer.`,
      );
      return;
    }
    const confirmed = await this.confirm.ask({
      title: `Supprimer ${dossier.ref} de l'état ?`,
      text: `Le dossier ${dossier.ref} (${dossier.client}) sera retiré de l'état en cours de constitution.`,
      okLabel: 'Supprimer le dossier',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    if (!(await this.run(() => this.store.remove(dossier.id).then(() => true)))) {
      return;
    }
    this.toast.success(`Dossier ${dossier.ref} supprimé de l'état.`);
  }

  async cancelEtat(): Promise<void> {
    const draft = this.draft();
    if (!draft.length) {
      return;
    }
    if (this.editId()) {
      this.toast.warning("Terminez ou annulez la modification en cours avant d'annuler l'état.");
      return;
    }
    const confirmed = await this.confirm.ask({
      title: "Annuler l'état ?",
      text: `Les ${draft.length} dossier(s) de l'état en cours de constitution seront supprimés.`,
      okLabel: "Annuler l'état",
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    const ok = await this.run(async () => {
      for (const dossier of draft) {
        await this.store.remove(dossier.id);
      }
      return true;
    });
    if (ok) {
      this.toast.success("L'état en cours a été annulé.");
    }
  }

  async send(): Promise<void> {
    const draft = this.draft();
    const account = this.session.account();
    if (!draft.length || !account) {
      this.toast.warning('Ajoutez au moins un dossier avant de transmettre.');
      return;
    }
    if (this.groups().miss.length) {
      this.toast.warning(
        "Un ou plusieurs dossiers n'appartiennent à aucun type d'état : corrigez-les avant de transmettre.",
      );
      return;
    }
    if (!(await this.confirmLeave())) {
      return;
    }
    const groups = this.groups().groups;
    const etatType = this.etatType();
    const text = this.autoMode()
      ? `${draft.length} dossier(s) · cet envoi produira ${groups.length} état(s) : ${this.groupsText()}. Chaque état a sa référence et son bordereau. Cette action est définitive et horodatée.`
      : `${draft.length} dossier(s) seront transmis à ${etatType ? entityLabel(etatType.recep) : '—'} (type d'état « ${etatType?.nom ?? '—'} »). Cette action est définitive et horodatée.`;
    const confirmed = await this.confirm.ask({
      title: "Valider et transmettre l'état ?",
      text,
      note: `En confirmant, vous certifiez que les ${draft.length} dossier(s) accompagnent cet état.`,
      okLabel: 'Confirmer la transmission',
    });
    if (!confirmed) {
      return;
    }

    const etats = await this.run(() =>
      this.store.transmit(
        this.autoMode() ? null : (etatType?.id ?? null),
        draft.map((dossier) => dossier.id),
      ),
    );
    if (!etats?.length) {
      return;
    }
    this.clearForm(true);
    this.sentEtats.set(etats);
    this.toast.success(
      etats.length > 1
        ? `${etats.length} états transmis : ${etats.map((etat) => `${etat.ref} → ${etat.dest}`).join(' · ')}`
        : `État ${etats[0].ref} transmis — ${etats[0].dest}.`,
    );
  }

  startNewEtat(): void {
    this.sentEtats.set([]);
  }

  printEtat(ref: string): void {
    const etat = this.sentEtats().find((candidate) => candidate.ref === ref);
    if (etat?.id) {
      this.bordereau.open(etat.id);
    }
  }

  unsavedMessage(): string {
    const editing = this.editing();
    if (editing) {
      return formSnapshot(this.value(), this.pieces()) !== this.editSnapshot
        ? `La modification du dossier ${editing.ref} n'est pas enregistrée.`
        : '';
    }
    return hasTypedContent(this.value())
      ? "Le formulaire contient un dossier non ajouté à l'état."
      : '';
  }

  async confirmLeave(): Promise<boolean> {
    const message = this.unsavedMessage();
    if (!message) {
      return true;
    }
    const confirmed = await this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      tone: 'warning',
      text: `${message} Si vous quittez cet écran, cette saisie sera perdue.`,
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
    if (confirmed) {
      this.clearForm(true);
    }
    return confirmed;
  }

  private revalidate(key: string, raw: string): void {
    if (this.errors()[key]) {
      this.errors.update((errors) => ({
        ...errors,
        [key]: fieldError(key, raw, this.value().type, todayIsoDate()),
      }));
    }
  }

  private showInvalid(error: string, errors: Record<string, string>): void {
    this.errors.set(errors);
    this.touched.set(true);
    this.formError.set(error);
  }

  private clearForm(resetChoices: boolean): void {
    const current = this.value();
    this.value.set(
      resetChoices
        ? emptyDossierForm(this.allowed()[0] ?? '')
        : {
            ...emptyDossierForm(),
            type: current.type,
            produit: current.produit,
            prio: current.prio,
          },
    );
    this.pieces.set([]);
    this.errors.set({});
    this.touched.set(false);
    this.formError.set('');
    this.pieceError.set('');
    this.editId.set(null);
    this.editOriginalType.set(null);
    this.editSnapshot = '';
  }

  private async run<T>(call: () => Promise<T>): Promise<T | null> {
    this.busy.set(true);
    try {
      return await call();
    } catch {
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
