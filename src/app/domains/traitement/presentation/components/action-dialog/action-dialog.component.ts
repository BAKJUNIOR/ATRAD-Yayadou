import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { isoDateInDays, isoDateToFr } from '../../../../../core/utils/date.util';
import { Status } from '../../../../../shared/models/status';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import {
  DOC_DELAI_JOURS,
  DossierAction,
  DossierActionKind,
  FINAL_STATUSES,
  PIECES_PAR_TYPE,
} from '../../../../dossiers/domain/workflow';

export interface ActionDialogData {
  dossier: RoutedDossier;
  kind: DossierActionKind;
  /** Statut visé, pour un simple changement de statut. */
  target?: Status;
}

const OTHER = 'Autre';

/** Confirmation d'une action de traitement, avec les informations qu'elle exige. */
@Component({
  selector: 'app-action-dialog',
  host: {
    class:
      'flex max-h-[calc(100vh-3rem)] w-[min(440px,calc(100vw-3rem))] animate-enter flex-col gap-3.5 overflow-y-auto rounded-[calc(var(--radius-brand)*1.6)] bg-card p-[26px] shadow-[0_24px_64px_-16px_rgba(14,22,34,0.38),0_0_0_1px_rgba(14,22,34,0.06)]',
  },
  templateUrl: './action-dialog.component.html',
})
export class ActionDialogComponent {
  protected readonly data = inject<ActionDialogData>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<DossierAction>>(DialogRef);

  protected readonly kind = this.data.kind;
  protected readonly docDelay = DOC_DELAI_JOURS;
  protected readonly deadline = isoDateToFr(isoDateInDays(DOC_DELAI_JOURS));
  protected readonly docOptions = [...PIECES_PAR_TYPE[this.data.dossier.type], OTHER];

  protected readonly reason = signal('');
  protected readonly note = signal('');
  protected readonly other = signal('');
  private readonly checked = signal<ReadonlySet<string>>(new Set());

  protected readonly otherChecked = computed(() => this.checked().has(OTHER));

  protected readonly copy = this.buildCopy();

  /** Ce qu'il reste à renseigner avant de pouvoir confirmer. */
  protected readonly missing = computed(() => {
    const missing: string[] = [];
    if (this.kind === 'retour_noneligible' && !this.reason().trim()) {
      missing.push('motif');
    }
    if (this.kind === 'rejet_info') {
      if (!this.checked().size) {
        missing.push('au moins un document manquant');
      }
      if (this.otherChecked() && !this.other().trim()) {
        missing.push('précision du document « Autre »');
      }
    }
    return missing;
  });

  protected isChecked(doc: string): boolean {
    return this.checked().has(doc);
  }

  protected toggle(doc: string): void {
    this.checked.update((checked) => {
      const next = new Set(checked);
      if (!next.delete(doc)) {
        next.add(doc);
      }
      return next;
    });
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected confirm(): void {
    if (this.missing().length) {
      return;
    }
    this.dialogRef.close(this.buildAction());
  }

  private buildAction(): DossierAction {
    switch (this.kind) {
      case 'statut':
        return { kind: 'statut', target: this.data.target ?? this.data.dossier.status };
      case 'retour_noneligible':
        return { kind: 'retour_noneligible', reason: this.reason().trim() };
      case 'retour_docs':
        return { kind: 'retour_docs', reason: this.reason().trim() };
      case 'rejet_info':
        return {
          kind: 'rejet_info',
          note: this.note(),
          docs: this.docOptions
            .filter((doc) => this.checked().has(doc))
            .map((doc) => (doc === OTHER ? `Autre : ${this.other().trim()}` : doc)),
        };
      default:
        return { kind: this.kind };
    }
  }

  private buildCopy(): { title: string; text: string; confirm: string; buttonClass: string } {
    const { dossier, target } = this.data;
    const brand = 'bg-brand hover:bg-brand-dark';
    switch (this.kind) {
      case 'cloturer':
        return {
          title: `Clôturer le dossier ${dossier.ref} ?`,
          text: "La clôture est définitive : le dossier sort du portefeuille actif et l'agence d'origine est notifiée.",
          confirm: 'Clôturer définitivement',
          buttonClass: 'bg-navy hover:brightness-110',
        };
      case 'retour_noneligible':
        return {
          title: `Retourner le dossier ${dossier.ref} pour non-éligibilité ?`,
          text: `Le dossier sera renvoyé vers l'Accueil (écran « Dossiers retournés »), qui le retournera à l'agence d'origine (${dossier.agence}). Statut : Dossier retourné.`,
          confirm: "Renvoyer vers l'Accueil",
          buttonClass: 'bg-[#8a5a11] hover:brightness-110',
        };
      case 'rejet_info':
        return {
          title: `Demander des documents complémentaires pour ${dossier.ref} ?`,
          text: `Cochez le(s) document(s) manquant(s). Le dossier reste dans l'entité au statut « En attente de document(s) complémentaire(s) » et le gestionnaire de l'agence d'origine (${dossier.agence}) est notifié.`,
          confirm: "Notifier l'agence",
          buttonClass: 'bg-[#8a5a11] hover:brightness-110',
        };
      case 'retour_docs': {
        const expected = (dossier.docsMissing ?? []).join(', ') || dossier.complements || '—';
        const deadline = dossier.docsDeadlineIso
          ? ` (à fournir avant le ${isoDateToFr(dossier.docsDeadlineIso)})`
          : '';
        return {
          title: `Retourner le dossier ${dossier.ref} faute de document(s) ?`,
          text: `Document(s) attendu(s) : ${expected}${deadline}. Le dossier passe au statut « Dossier retourné » et apparaît dans « Dossiers retournés » de l'Accueil, qui le renverra à l'agence. L'agence est notifiée.`,
          confirm: 'Retourner le dossier',
          buttonClass: 'bg-danger-solid hover:brightness-90',
        };
      }
      case 'statut':
        return {
          title: `Passer le dossier ${dossier.ref} au statut « ${target} » ?`,
          text:
            `Transition autorisée par le circuit « ${dossier.type} » (${dossier.status} → ${target}). Le changement est horodaté et tracé dans l'historique du dossier et le journal d'audit.` +
            (target && FINAL_STATUSES.includes(target)
              ? ' Statut final : le dossier ne sera plus modifiable.'
              : ''),
          confirm: 'Confirmer',
          buttonClass: brand,
        };
      default:
        return {
          title: `Valider le dossier ${dossier.ref} ?`,
          text: 'Le dossier passera au statut Validé et sera horodaté. Il pourra ensuite être clôturé.',
          confirm: 'Valider le dossier',
          buttonClass: brand,
        };
    }
  }
}
