import { Dialog } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, concat, of, switchMap } from 'rxjs';
import { PaginationResponse } from '../../../../../core/models/pagination.model';
import { RealtimeService } from '../../../../../core/realtime/realtime.service';
import { SessionService } from '../../../../../core/services/session.service';
import { formatDate, formatTime } from '../../../../../core/utils/date.util';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { PaginationComponent } from '../../../../../shared/ui/pagination/pagination.component';
import { BordereauService } from '../../../../dossiers/presentation/bordereau.service';
import { CritereRecherche, EtatTrouve, criteresPour, receptionOf } from '../../../domain/recherche';
import { RechercheApi } from '../../../infrastructure/api/recherche.api';
import { EtatApercuComponent } from '../../components/etat-apercu/etat-apercu.component';

const PAGE_SIZE = 8;

type Onglet = 'etats' | 'attestations';

interface Requete {
  critere: CritereRecherche;
  valeur: string;
}

@Component({
  selector: 'app-recherche',
  imports: [IconComponent, PaginationComponent],
  templateUrl: './recherche.component.html',
})
export class RechercheComponent {
  private readonly api = inject(RechercheApi);
  private readonly realtime = inject(RealtimeService);
  private readonly dialog = inject(Dialog);
  private readonly bordereau = inject(BordereauService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  protected readonly receptionOf = receptionOf;

  protected readonly criteres = criteresPour(inject(SessionService).role());
  protected readonly critere = signal<CritereRecherche>('COMPTE');
  protected readonly option = computed(
    () => this.criteres.find((critere) => critere.value === this.critere()) ?? this.criteres[0],
  );
  protected readonly valeur = signal('');
  protected readonly erreur = signal('');

  protected readonly requete = signal<Requete | null>(null);
  protected readonly onglet = signal<Onglet>('etats');
  protected readonly pageEtats = signal(0);
  protected readonly pageAttestations = signal(0);

  protected readonly etats = this.charger(this.pageEtats, (requete, page) =>
    this.api.etats(requete.critere, requete.valeur, page, PAGE_SIZE),
  );
  protected readonly attestations = this.charger(this.pageAttestations, (requete, page) =>
    this.api.attestations(requete.critere, requete.valeur, page, PAGE_SIZE),
  );

  protected readonly libelleCritere = computed(
    () => this.criteres.find((critere) => critere.value === this.requete()?.critere)?.label ?? '',
  );

  protected pickCritere(critere: CritereRecherche): void {
    this.critere.set(critere);
    this.erreur.set('');
  }

  protected onValeur(event: Event): void {
    this.valeur.set((event.target as HTMLInputElement).value);
    this.erreur.set('');
  }

  protected rechercher(event: Event): void {
    event.preventDefault();
    const valeur = this.valeur().trim();
    if (!valeur) {
      this.erreur.set(`Saisissez le ${this.option().field.toLowerCase()} à rechercher.`);
      return;
    }
    this.pageEtats.set(0);
    this.pageAttestations.set(0);
    this.onglet.set('etats');
    this.requete.set({ critere: this.critere(), valeur });
  }

  protected voir(etatId: string): void {
    this.dialog.open<void, string>(EtatApercuComponent, {
      data: etatId,
      ariaLabel: "Détail de l'état de transmission",
      backdropClass: 'app-dialog-backdrop',
    });
  }

  protected imprimer(etat: EtatTrouve): void {
    this.bordereau.open(etat.id);
  }

  /** `null` avant la première recherche, `undefined` pendant celle d'une nouvelle valeur ; un changement de page garde la précédente. */
  private charger<T>(
    page: () => number,
    source: (requete: Requete, page: number) => Observable<PaginationResponse<T>>,
  ) {
    const demande = computed(() => {
      const requete = this.requete();
      return requete ? { requete, page: page() } : null;
    });
    let derniere: Requete | null = null;
    return toSignal(
      toObservable(demande).pipe(
        switchMap((params) => {
          if (!params) {
            return of(null);
          }
          const lecture = this.realtime.live(() => source(params.requete, params.page));
          const nouvelle = params.requete !== derniere;
          derniere = params.requete;
          return nouvelle ? concat(of(undefined), lecture) : lecture;
        }),
      ),
      { initialValue: null },
    );
  }
}
