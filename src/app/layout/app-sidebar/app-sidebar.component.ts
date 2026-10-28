import { Dialog } from '@angular/cdk/dialog';
import { Location, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HOME, NAVIGATION, NavMenu, ROLE_CAPABILITY } from '../../core/navigation/navigation';
import { BrandService } from '../../core/services/brand.service';
import { DemoClock } from '../../core/services/demo-clock.service';
import { StorageService } from '../../core/services/storage.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDate } from '../../core/utils/date.util';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { initialsOf } from '../../core/utils/text.util';
import { ReceptionContext } from '../../domains/accueil/presentation/reception-context.service';
import { DatasetId } from '../../domains/dossiers/domain/datasets';
import { hasCapability, labelOf, traitEntites } from '../../domains/dossiers/domain/referentiel';
import { ReferentielStore } from '../../domains/dossiers/infrastructure/store/referentiel.store';
import { PieceFileStore } from '../../domains/dossiers/infrastructure/store/piece-file.store';
import { RoutingStore } from '../../domains/dossiers/infrastructure/store/routing.store';
import { TransmissionStore } from '../../domains/dossiers/infrastructure/store/transmission.store';
import { ProfileStore } from '../../domains/profile/infrastructure/store/profile.store';
import { NavBadgesService } from '../../domains/notifications/nav-badges.service';
import { TraitementContext } from '../../domains/traitement/presentation/traitement-context.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import {
  ResetDemoDialogComponent,
  ResetDemoDialogData,
} from '../reset-demo-dialog/reset-demo-dialog.component';

@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, IconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly sidebar = inject(SidebarService);
  private readonly clock = inject(DemoClock);
  private readonly store = inject(TransmissionStore);
  private readonly files = inject(PieceFileStore);
  private readonly routing = inject(RoutingStore);
  private readonly storage = inject(StorageService);
  private readonly brand = inject(BrandService);
  private readonly profiles = inject(ProfileStore);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);
  protected readonly badges = inject(NavBadgesService).counts;

  protected readonly account = this.session.account;
  protected readonly collapsed = this.sidebar.isCollapsed;

  protected readonly traitement = inject(TraitementContext);
  private readonly referentiel = inject(ReferentielStore);
  private readonly reception = inject(ReceptionContext);
  protected readonly isTraitement = computed(() => this.session.role() === 'traitement');

  /** Entités proposées dans « Voir en tant que », avec leurs capacités. */
  protected readonly entites = computed(() => {
    this.referentiel.value();
    return traitEntites().map((entite) => {
      const caps = [
        entite.emet && 'Émettrice',
        entite.recep && 'Réceptrice',
        entite.trait && 'Traitement',
      ].filter(Boolean);
      return {
        name: labelOf(entite),
        label: `${entite.nom} · ${caps.join(' + ')} · ${entite.code}`,
      };
    });
  });

  protected readonly menu = computed((): NavMenu | null => {
    this.referentiel.value();
    const role = this.session.role();
    if (!role) {
      return null;
    }
    const menu = NAVIGATION[role];
    // Une entité privée de la capacité de son profil ne garde que l'accueil.
    const capability = ROLE_CAPABILITY[role];
    const entity = role === 'traitement' ? this.traitement.entite() : this.account()?.entity;
    if (capability && !hasCapability(entity ?? '', capability)) {
      return { ...menu, items: [HOME] };
    }
    if (role !== 'traitement') {
      return menu;
    }
    // L'agent ne voit que les écrans correspondant à ses fonctions dans l'entité.
    const functions = this.traitement.functions();
    const items = menu.items.filter((item) => !item.requires || functions[item.requires]);
    if (!this.reception.canReceive()) {
      return { ...menu, items };
    }
    // Entité qui réceptionne et traite : les écrans de réception puis ceux de traitement.
    const treatment = items.filter((item) => item.id !== HOME.id);
    return {
      ...menu,
      items: [
        HOME,
        {
          id: 'grpRec',
          label: 'Réception',
          icon: '⇲',
          children: NAVIGATION.accueil.items.slice(1),
        },
        ...(treatment.length
          ? [{ id: 'grpTr', label: 'Traitement', icon: '◫', children: treatment }]
          : []),
      ],
    };
  });

  protected onEntite(event: Event): void {
    this.traitement.setEntite((event.target as HTMLSelectElement).value);
    void this.router.navigate(['/']);
  }

  protected onUser(event: Event): void {
    this.traitement.setUser((event.target as HTMLSelectElement).value);
    void this.router.navigate(['/']);
  }

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));

  // Les groupes sont repliés par défaut : un clic les déplie. Seul le groupe de l'écran
  // affiché au chargement est ouvert d'emblée, pour que l'entrée active reste visible.
  private readonly openGroups = signal<ReadonlySet<string>>(this.groupsOfCurrentUrl());

  // Le repli ne concerne que les écrans larges : en tiroir mobile, les libellés restent visibles.
  protected readonly labelClass = computed(() => (this.collapsed() ? 'lg:hidden' : ''));
  protected readonly itemClass = computed(() =>
    this.collapsed() ? 'lg:justify-center lg:px-0' : '',
  );
  protected readonly nestedItemClass = computed(() =>
    this.collapsed() ? `ps-11 ${this.itemClass()}` : 'ps-11',
  );
  protected readonly asideClass = computed(() => {
    const width = this.collapsed() ? 'lg:w-[92px]' : 'lg:w-[300px]';
    const drawer = this.sidebar.isMobileOpen()
      ? 'translate-x-0 shadow-2xl'
      : '-translate-x-full max-lg:invisible';
    return `${width} ${drawer}`;
  });

  protected isGroupOpen(id: string): boolean {
    return this.openGroups().has(id);
  }

  protected toggleGroup(id: string): void {
    this.openGroups.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  private groupsOfCurrentUrl(): Set<string> {
    const groups = this.menu()?.items.filter((item) => item.children) ?? [];
    // `Location` et non `Router.url` : la coquille est créée avant la fin de la navigation.
    const url = this.location.path();
    return new Set(
      groups
        .filter((group) => group.children?.some((child) => url.startsWith(child.path!)))
        .map((group) => group.id),
    );
  }

  /** `Date de démo : 18/10/2026 (+6 j)` */
  protected readonly demoDateLabel = computed(() => {
    const offset = this.clock.offset();
    return `Date de démo : ${formatDate(this.clock.today())}${offset ? ` (+${offset} j)` : ''}`;
  });

  protected advanceDay(): void {
    this.clock.advance();
    this.toast.info(`Date de démo : ${formatDate(this.clock.today())} — retards recalculés.`);
  }

  /**
   * Efface les données de démo et recharge l'application avec le jeu de données choisi : tout
   * le paramétrage (référentiel, routage, marque, thème) revient à celui de ce jeu.
   */
  protected async resetDemo(): Promise<void> {
    const ref = this.dialog.open<DatasetId, ResetDemoDialogData>(ResetDemoDialogComponent, {
      data: { current: this.referentiel.datasetId },
      ariaLabel: 'Réinitialiser les données de démo',
      backdropClass: 'app-dialog-backdrop',
    });
    const dataset = await firstValueFrom(ref.closed);
    if (!dataset) {
      return;
    }
    this.referentiel.chooseDataset(dataset);
    this.store.reset();
    // Effacé tout de suite : le rechargement n'attend pas l'enregistrement du store.
    this.storage.remove('atrad_live_data_v1');
    this.routing.reset();
    this.referentiel.reset();
    await this.files.clear().catch(() => undefined);
    this.clock.reset();
    this.storage.remove('atrad_notif_read_v1');
    this.brand.reset();
    this.profiles.reset();
    this.theme.clearChoice();
    location.assign('/');
  }

  protected closeDrawer(): void {
    this.sidebar.setMobileOpen(false);
  }

  protected signOut(): void {
    this.closeDrawer();
    void this.session.signOutAndLeave();
  }
}
