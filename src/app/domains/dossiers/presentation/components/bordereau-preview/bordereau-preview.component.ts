import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { BrandService } from '../../../../../core/services/brand.service';
import { SessionService } from '../../../../../core/services/session.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { formatStamp, nowIso } from '../../../../../core/utils/date.util';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { canPrintEtat } from '../../../domain/entities/etat.entity';
import { entityCode, etatInfo, recepOf } from '../../../domain/referentiel';
import { entityOfDossier } from '../../../domain/routing';
import { Etat } from '../../../domain/entities/etat.entity';
import { etatFromApi } from '../../../domain/entities/dossier-api.entity';
import { EtatApi } from '../../../infrastructure/api/etat.api';

@Component({
  selector: 'app-bordereau-preview',
  imports: [ButtonComponent, IconComponent],
  host: { class: 'print-reset flex h-full flex-col bg-navy/60' },
  templateUrl: './bordereau-preview.component.html',
})
export class BordereauPreviewComponent {
  private readonly etatApi = inject(EtatApi);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly etatId = inject<string>(DIALOG_DATA);
  protected readonly dialogRef = inject<DialogRef<void>>(DialogRef);

  protected readonly brand = inject(BrandService);
  protected readonly editedAt = formatStamp(nowIso());
  protected readonly formatStamp = formatStamp;

  /** État lu dans l'API, avec tout le contenu de ses dossiers. */
  protected readonly etat = signal<Etat | null>(null);

  constructor() {
    this.etatApi.etat(this.etatId).subscribe({
      next: (etat) => this.etat.set(etatFromApi(etat)),
      error: () => this.dialogRef.close(),
    });
  }

  /** Type d'état et entité réceptrice. */
  protected readonly info = computed(() => etatInfo(this.etat()));

  /** Inutile quand l'entité réceptrice traite elle-même tous les dossiers de l'état. */
  protected readonly showEntity = computed(() => {
    const etat = this.etat();
    return !!etat?.dossiers.some(
      (dossier) => entityCode(entityOfDossier(dossier)) !== recepOf(etat),
    );
  });

  protected readonly rows = computed(() =>
    (this.etat()?.dossiers ?? []).map((dossier, index) => ({
      n: index + 1,
      ref: dossier.ref,
      client: dossier.client,
      num: dossier.num,
      type: dossier.type,
      produit: dossier.produit,
      entite: entityOfDossier(dossier),
      compte: dossier.compte || '—',
      prio: dossier.prio,
      montant: dossier.montant ?? '',
      extra: dossier.extra,
      pieces: dossier.pieces.length
        ? `${dossier.pieces.length} : ${dossier.pieces.map((piece) => piece.name).join(', ')}`
        : 'Aucune',
    })),
  );

  /** Signataire de l'édition : `Aminata Diallo — AG-014`. */
  protected readonly editedBy = computed(() => {
    const account = this.session.account();
    if (!account) {
      return '';
    }
    const code = account.entity.match(/\(([^)]+)\)/)?.[1] ?? account.entity;
    return `${account.name} — ${code}`;
  });

  protected print(): void {
    const etat = this.etat();
    if (!canPrintEtat(etat)) {
      this.toast.warning(
        "Impression impossible : l'état doit être au statut Transmis ou plus avancé.",
      );
      return;
    }
    window.print();
  }
}
