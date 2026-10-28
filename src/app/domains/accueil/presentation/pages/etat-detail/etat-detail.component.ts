import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../../../core/services/session.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { EtatDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { entityCode, etatInfo, recepOf } from '../../../../dossiers/domain/referentiel';
import { entityOf, shortEntity } from '../../../../dossiers/domain/routing';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { DossierDetailsComponent } from '../../../../dossiers/presentation/components/dossier-details/dossier-details.component';
import {
  ReceptionDialogComponent,
  ReceptionDialogData,
} from '../../components/reception-dialog/reception-dialog.component';
import { ReceptionContext } from '../../reception-context.service';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** `2 dossiers reçus` */
function plural(count: number, word: string): string {
  return `${count} dossier${count > 1 ? 's' : ''} ${word}${count > 1 ? 's' : ''}`;
}

/** Parcours accueil : pointer les dossiers d'un état physiquement reçus. */
@Component({
  selector: 'app-etat-detail',
  imports: [RouterLink, IconComponent, StatusBadgeComponent, DossierDetailsComponent],
  templateUrl: './etat-detail.component.html',
})
export class EtatDetailComponent {
  private readonly store = inject(TransmissionStore);
  private readonly reception = inject(ReceptionContext);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  /** Référence de l'état, lue dans l'URL (`/accueil-central/etats-recus/:ref`). */
  readonly ref = input.required<string>();

  protected readonly formatStamp = formatStamp;
  protected readonly priorityText = PRIORITY_TEXT;

  private readonly picked = signal<ReadonlySet<string>>(new Set());
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected readonly etat = computed(
    () => this.reception.etats().find((etat) => etat.ref === this.ref()) ?? null,
  );
  /** Type d'état et entité réceptrice. */
  protected readonly info = computed(() => etatInfo(this.etat()));

  /** Les dossiers que l'entité réceptrice traite elle-même ne passent pas par le dispatch. */
  private isDirect(type: string): boolean {
    return entityCode(entityOf(type)) === recepOf(this.etat());
  }

  protected readonly helpLine = computed(() => {
    const etat = this.etat();
    const selfOnly =
      this.reception.recepCode() === recepOf(etat) &&
      this.session.role() === 'traitement' &&
      !!etat?.dossiers.every((dossier) => this.isDirect(dossier.type));
    return selfOnly
      ? "Vous confirmez la réception physique des dossiers (type, client). Les dossiers reçus entrent directement dans la répartition interne de votre entité, où s'effectue le contrôle du contenu."
      : `${this.session.role() === 'accueil' ? "L'Accueil" : "L'entité réceptrice"} confirme la réception du dossier (type, client). Le contrôle du contenu est effectué par l'entité de traitement.`;
  });
  private readonly remaining = computed(() =>
    (this.etat()?.dossiers ?? []).filter((dossier) => !dossier.rec),
  );
  private readonly pickedRemaining = computed(() =>
    this.remaining().filter((dossier) => this.picked().has(dossier.ref)),
  );

  protected readonly rows = computed(() => {
    const etat = this.etat();
    const routed = new Map(this.store.dossiers().map((dossier) => [dossier.ref, dossier.entite]));
    return (etat?.dossiers ?? []).map((dossier) => ({
      dossier: { ...dossier, entite: routed.get(dossier.ref) },
      entite: !entityOf(dossier.type)
        ? '⚠ Aucune entité paramétrée'
        : this.isDirect(dossier.type)
          ? 'Traité ici'
          : shortEntity(entityOf(dossier.type)),
      checked: this.picked().has(dossier.ref),
      open: this.expanded().has(dossier.ref),
      ...this.receptionOf(dossier, !!etat?.sentAt),
    }));
  });

  protected readonly title = computed(() =>
    this.etat()?.receivedAt ? 'Réceptionner les dossiers restants' : 'Pointage des dossiers reçus',
  );
  protected readonly pickedCount = computed(() => this.pickedRemaining().length);
  protected readonly remainingCount = computed(() => this.remaining().length);
  protected readonly countLabel = computed(
    () =>
      `${this.pickedCount()} sur ${this.remainingCount()} coché${this.pickedCount() > 1 ? 's' : ''}`,
  );
  protected readonly allExpanded = computed(() => {
    const dossiers = this.etat()?.dossiers ?? [];
    return dossiers.length > 0 && dossiers.every((dossier) => this.expanded().has(dossier.ref));
  });

  protected toggle(ref: string): void {
    this.picked.update((picked) => this.flipped(picked, ref));
  }

  protected checkAll(): void {
    this.picked.set(new Set(this.remaining().map((dossier) => dossier.ref)));
  }

  protected uncheckAll(): void {
    this.picked.set(new Set());
  }

  protected toggleDetails(ref: string): void {
    this.expanded.update((expanded) => this.flipped(expanded, ref));
  }

  protected toggleAllDetails(): void {
    this.expanded.set(
      this.allExpanded() ? new Set() : new Set(this.etat()?.dossiers.map((dossier) => dossier.ref)),
    );
  }

  protected async confirm(): Promise<void> {
    const etat = this.etat();
    const picked = this.pickedRemaining();
    if (!etat || !picked.length) {
      this.toast.warning('Cochez au moins un dossier reçu.');
      return;
    }
    const missing = this.remaining().filter((dossier) => !this.picked().has(dossier.ref));
    const allDirect = picked.every((dossier) => this.isDirect(dossier.type));
    const data: ReceptionDialogData = {
      etatRef: etat.ref,
      receivedTitle: allDirect
        ? `Reçus — pris en charge directement par ${etatInfo(etat).dest}`
        : 'Reçus — dispatchés vers leur entité de traitement',
      summary:
        plural(picked.length, 'reçu') +
        (missing.length ? `, ${plural(missing.length, 'non reçu')}` : ''),
      received: picked
        .map((dossier) =>
          this.isDirect(dossier.type)
            ? dossier.ref
            : `${dossier.ref} (→ ${shortEntity(entityOf(dossier.type))})`,
        )
        .join(', '),
      missing: missing.map((dossier) => `${dossier.ref} — ${dossier.client}`).join(', '),
    };
    const ref = this.dialog.open<boolean, ReceptionDialogData>(ReceptionDialogComponent, {
      data,
      ariaLabel: `Confirmer la réception de ${etat.ref}`,
      backdropClass: 'app-dialog-backdrop',
    });
    if ((await firstValueFrom(ref.closed)) !== true) {
      return;
    }

    const result = this.store.receive(
      etat.ref,
      picked.map((dossier) => dossier.ref),
      this.reception.by(),
      this.reception.recepCode(),
    );
    if (!result.ok) {
      this.toast.error(result.error);
      return;
    }
    this.picked.set(new Set());
    const at = formatStamp(this.etat()?.recLog?.at(-1)?.at ?? '');
    this.toast.success(
      `${result.received} dossier(s) reçu(s)${result.missing ? `, ${result.missing} non reçu(s)` : ''} le ${at}${result.allDirect ? ` et pris en charge par ${etatInfo(this.etat()).dest}.` : ` — dispatch : ${result.routing}.`}`,
    );
  }

  private receptionOf(dossier: EtatDossier, sent: boolean) {
    if (dossier.rec) {
      return {
        pill: 'Reçu',
        icon: '✓',
        tone: 'tone-success',
        note: `Reçu le ${formatStamp(dossier.rec.at)}`,
        noteClass: 'text-brand-ink',
        selectable: false,
      };
    }
    if (dossier.nonRec) {
      return {
        pill: 'Non reçu',
        icon: '✕',
        tone: 'tone-danger',
        note: `Non reçu (pointage du ${formatStamp(dossier.nonRec.at)})`,
        noteClass: 'text-danger',
        selectable: true,
      };
    }
    return {
      pill: 'En attente',
      icon: '…',
      tone: 'tone-warning',
      note: sent ? 'En attente de réception' : '—',
      noteClass: 'text-warning',
      selectable: true,
    };
  }

  private flipped(set: ReadonlySet<string>, value: string): Set<string> {
    const next = new Set(set);
    if (!next.delete(value)) {
      next.add(value);
    }
    return next;
  }
}
