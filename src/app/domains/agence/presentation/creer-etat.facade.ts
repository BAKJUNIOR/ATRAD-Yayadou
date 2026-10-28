import { Injectable, computed, inject, signal } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { nowIso, todayIsoDate } from '../../../core/utils/date.util';
import { DossierType, dataset, fieldsOf } from '../../dossiers/domain/dossier-catalog';
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
import { PieceFileStore } from '../../dossiers/infrastructure/store/piece-file.store';
import { TransmissionStore } from '../../dossiers/infrastructure/store/transmission.store';
import { BordereauService } from '../../dossiers/presentation/bordereau.service';
import {
  BASE_FIELD_KEYS,
  BaseFieldKey,
  DossierFormValue,
  buildDossierData,
  changedLabels,
  emptyDossierForm,
  fieldError,
  filterClientInput,
  formSnapshot,
  formValueOf,
  hasTypedContent,
} from '../domain/dossier-form.rules';

type TextFieldKey = BaseFieldKey | 'note';

/** Au-delà, une recherche est proposée au-dessus de la liste des types de dossier. */
const TYPE_SEARCH_THRESHOLD = 15;

/**
 * État et actions de l'écran « Créer un état » : saisie d'un dossier, constitution de l'état
 * puis transmission. Fourni par la page et partagé par ses composants.
 */
@Injectable()
export class CreerEtatFacade {
  private readonly store = inject(TransmissionStore);
  private readonly files = inject(PieceFileStore);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly bordereau = inject(BordereauService);
  private readonly referentiel = inject(ReferentielStore);

  /** Libellés et règles du formulaire propres au jeu de données. */
  readonly labels = dataset().form;

  // --- Type d'état et types de dossier autorisés pour l'entité émettrice
  private readonly emetCode = computed(() => entityCode(this.session.account()?.entity ?? ''));
  readonly autoMode = computed(() => this.referentiel.value().saisieMode === 'auto');
  /** Types d'état ouverts à l'entité ; vide si l'administrateur ne l'autorise nulle part. */
  readonly etatTypes = computed(() => {
    this.referentiel.value();
    return etatTypesFor(this.emetCode());
  });
  /** Type d'état choisi (mode « choix ») ; à défaut, celui du premier dossier du brouillon. */
  private readonly etatTypeChoice = signal(
    etatTypeOfDossier(this.store.draft()[0]?.type ?? '')?.id ?? '',
  );
  readonly etatType = computed(() => {
    this.referentiel.value();
    return currentEtatType(this.emetCode(), this.etatTypeChoice()) ?? null;
  });
  readonly allowed = computed(() => {
    this.referentiel.value();
    return allowedTypes(this.emetCode(), this.etatType()?.id ?? '');
  });
  readonly typeQuery = signal('');
  readonly typeSearchOn = computed(() => this.allowed().length > TYPE_SEARCH_THRESHOLD);
  /** Types proposés : filtrés par la recherche, le type sélectionné restant visible. */
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

  // --- Formulaire de dossier
  readonly value = signal<DossierFormValue>(emptyDossierForm(this.allowed()[0] ?? ''));
  readonly errors = signal<Record<string, string>>({});
  /** Une tentative d'envoi a échoué : les champs obligatoires vides sont signalés. */
  readonly touched = signal(false);
  readonly formError = signal('');
  readonly pieces = signal<PieceJointe[]>([]);
  readonly pieceError = signal('');

  // --- Modification d'un dossier de l'état en cours
  readonly editId = signal<number | null>(null);
  readonly editOriginalType = signal<DossierType | null>(null);
  private editSnapshot = '';

  // --- État en cours et état venant d'être transmis
  readonly draft = this.store.draft;
  readonly draftRef = this.store.draftRef;
  readonly draftCreatedAt = this.store.draftCreatedAt;
  private readonly sentRefs = signal<readonly string[]>([]);

  /** États produits par le dernier envoi (un par type d'état). */
  readonly sentEtats = computed(() =>
    this.sentRefs()
      .map((ref) => this.store.etats().find((etat) => etat.ref === ref))
      .filter((etat): etat is Etat => !!etat),
  );
  readonly sentEtat = computed(() => this.sentEtats()[0] ?? null);
  readonly editing = computed(
    () => this.draft().find((dossier) => dossier.id === this.editId()) ?? null,
  );
  readonly typeFields = computed(() => fieldsOf(this.value().type));
  readonly plannedEntity = computed(() => entityOf(this.value().type));
  readonly draftEntities = computed(() => entitySummary(this.draft()));

  /** Dossiers du brouillon répartis par type d'état, et ceux qu'aucun n'accepte. */
  readonly groups = computed(() => {
    this.referentiel.value();
    return draftGroups(this.draft(), this.emetCode(), this.etatType()?.id ?? '');
  });

  /** Ligne « Destination » de l'en-tête de l'état en cours. */
  readonly destinationLabel = computed(() => {
    if (this.autoMode()) {
      const count = this.groups().groups.length;
      return count ? `${count} état(s) seront générés` : "Générée à la validation, par type d'état";
    }
    const etatType = this.etatType();
    return etatType ? `${etatType.nom} · ${entityLabel(etatType.recep)}` : '—';
  });

  /** `Informatique → Service Informatique (SI-001) (2 dossiers) · …` */
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
    return this.autoMode() && this.draft().length
      ? `Cet envoi produira ${count} état${count > 1 ? 's' : ''} : ${this.groupsText()}`
      : '';
  });

  readonly blockMessage = computed(() => {
    const { miss } = this.groups();
    return miss.length
      ? `Transmission impossible : ${miss.map((d) => `${d.ref} (${d.type})`).join(', ')} n'appartient à aucun type d'état autorisé pour votre entité. Modifiez ou retirez ce dossier.`
      : '';
  });

  /** Ligne de compte rendu de l'écran « État transmis ». */
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

  /** Changer de type en cours de modification efface les informations de l'ancien type. */
  readonly editTypeWarning = computed(() => {
    const editing = this.editing();
    return !!editing && editing.type !== this.value().type && editing.extra.length > 0;
  });

  /** Agence de l'utilisateur, sans son code. */
  readonly agenceName = computed(() =>
    (this.session.account()?.entity ?? '').replace(/ \([^)]+\)$/, ''),
  );

  // ---------------------------------------------------------------- Saisie

  /** Enregistre un champ texte et renvoie la valeur retenue (le n° client est filtré). */
  setText(key: TextFieldKey, raw: string): string {
    const text = key === 'client' ? filterClientInput(raw) : raw;
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
   * Change de type d'état. Si le brouillon contient des dossiers que le nouveau type n'accepte
   * pas, il est vidé après confirmation.
   */
  async setEtatType(id: string): Promise<void> {
    const current = this.etatType();
    const next = this.etatTypes().find((etatType) => etatType.id === id);
    if (!next || id === current?.id) {
      return;
    }
    const draft = this.draft();
    const refused = draft.filter((dossier) => !next.dossiers.includes(dossier.type));
    if (draft.length && refused.length) {
      const confirmed = await this.confirm.ask({
        title: "Changer de type d'état ?",
        text: `Le brouillon contient ${draft.length} dossier(s) du type d'état « ${current?.nom ?? ''} ». ${refused.length} ne sont pas acceptés par « ${next.nom} » : en continuant, le brouillon sera vidé. Annuler conserve le type d'état actuel.`,
        okLabel: 'Changer et vider le brouillon',
        danger: true,
      });
      if (!confirmed) {
        return;
      }
      for (const dossier of draft) {
        this.store.removeDossier(dossier.id);
        dossier.pieces.forEach((piece) => void this.files.delete(piece.id));
      }
    }
    this.etatTypeChoice.set(id);
    if (!this.allowed().includes(this.value().type)) {
      this.setType(this.allowed()[0] ?? '');
    }
    this.value.update((value) => ({ ...value, extra: {} }));
  }

  setType(type: DossierType): void {
    this.value.update((value) => ({ ...value, type }));
    // Les erreurs des champs propres à l'ancien type n'ont plus d'objet.
    this.errors.update((errors) =>
      Object.fromEntries(
        BASE_FIELD_KEYS.filter((key) => errors[key]).map((key) => [key, errors[key]]),
      ),
    );
    this.touched.set(false);
    this.formError.set('');
  }

  /** Contrôle un champ quand l'utilisateur le quitte. */
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

  /** Erreur d'un champ propre au type : contrôle effectué, ou champ obligatoire resté vide. */
  isInvalid(key: string): boolean {
    return !!this.errors()[key];
  }

  resetForm(): void {
    this.discardUnsavedPieces();
    this.clearForm(true);
  }

  // ---------------------------------------------------------- Pièces jointes

  async addPieces(fileList: FileList | null | undefined): Promise<void> {
    const { accepted, errors } = screenPieces(Array.from(fileList ?? []), this.pieces());
    if (!accepted.length) {
      this.pieceError.set(errors.join(' · '));
      return;
    }

    const at = nowIso();
    const by = this.session.account()?.name ?? '';
    const added: PieceJointe[] = accepted.map((file) => ({
      id: `pj-${crypto.randomUUID()}`,
      name: file.name,
      size: file.size,
      mime: file.type,
      ext: (file.name.split('.').pop() ?? '').toUpperCase().replace('JPEG', 'JPG'),
      at,
      by,
    }));

    try {
      await Promise.all(added.map((piece, index) => this.files.put(piece.id, accepted[index])));
      this.pieces.update((pieces) => [...pieces, ...added]);
      this.pieceError.set(errors.join(' · '));
    } catch {
      this.pieceError.set('Enregistrement des fichiers impossible dans ce navigateur.');
    }
  }

  removePiece(piece: PieceJointe): void {
    if (!this.isKeptInDraft(piece)) {
      void this.files.delete(piece.id);
    }
    this.pieces.update((pieces) => pieces.filter((candidate) => candidate.id !== piece.id));
    this.pieceError.set('');
  }

  // ------------------------------------------------- Ajout et modification

  submit(): void {
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
    const dossier = this.store.addDossier(result.data);
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

    this.store.updateDossier(previous.id, result.data, {
      at: nowIso(),
      who: this.session.account()?.name ?? '',
      label: `Dossier modifié avant transmission — ${changes.join(', ')}`,
      tone: 'warning',
      pre: true,
    });
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
    this.store.removeDossier(dossier.id);
    dossier.pieces.forEach((piece) => void this.files.delete(piece.id));
    this.toast.success(`Dossier ${dossier.ref} supprimé de l'état.`);
  }

  // ----------------------------------------------------------- Transmission

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
      title: `Valider et transmettre l'état ${this.draftRef()} ?`,
      text,
      note: `En confirmant, vous certifiez que les ${draft.length} dossier(s) accompagnent cet état.`,
      okLabel: 'Confirmer la transmission',
    });
    if (!confirmed) {
      return;
    }

    const result = this.store.transmit(account, etatType?.id ?? '');
    if (!result.ok) {
      this.toast.error(result.error);
      return;
    }
    this.clearForm(true);
    const { etats } = result;
    this.sentRefs.set(etats.map((etat) => etat.ref));
    this.toast.success(
      etats.length > 1
        ? `${etats.length} états transmis : ${etats.map((etat) => `${etat.ref} → ${etat.dest}`).join(' · ')}`
        : `État ${etats[0].ref} transmis — ${etats[0].dest}.`,
    );
  }

  startNewEtat(): void {
    this.sentRefs.set([]);
  }

  printEtat(ref: string): void {
    this.bordereau.open(ref);
  }

  // ------------------------------------------------- Saisie non enregistrée

  /** Motif pour lequel quitter l'écran ferait perdre une saisie, ou chaîne vide. */
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

  /** Demande confirmation avant d'abandonner une saisie en cours, puis la vide. */
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
      this.discardUnsavedPieces();
      this.clearForm(true);
    }
    return confirmed;
  }

  // ----------------------------------------------------------------- Privé

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

  /** Après un ajout, le type, le produit et la priorité sont conservés pour enchaîner les saisies. */
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

  private isKeptInDraft(piece: PieceJointe): boolean {
    return this.draft().some((dossier) => dossier.pieces.some((kept) => kept.id === piece.id));
  }

  private discardUnsavedPieces(): void {
    this.pieces()
      .filter((piece) => !this.isKeptInDraft(piece))
      .forEach((piece) => void this.files.delete(piece.id));
  }
}
