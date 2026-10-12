import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NAVIGATION } from '../../core/navigation/navigation';
import { BrandService } from '../../core/services/brand.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { DemoClock } from '../../core/services/demo-clock.service';
import { StorageService } from '../../core/services/storage.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDate } from '../../core/utils/date.util';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { initialsOf } from '../../core/utils/text.util';
import { ENTITES } from '../../domains/dossiers/domain/routing';
import { PieceFileStore } from '../../domains/dossiers/infrastructure/store/piece-file.store';
import { RoutingStore } from '../../domains/dossiers/infrastructure/store/routing.store';
import { TransmissionStore } from '../../domains/dossiers/infrastructure/store/transmission.store';
import { NavBadgesService } from '../../domains/notifications/nav-badges.service';
import { TraitementContext } from '../../domains/traitement/presentation/traitement-context.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, IconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly sidebar = inject(SidebarService);
  private readonly clock = inject(DemoClock);
  private readonly store = inject(TransmissionStore);
  private readonly files = inject(PieceFileStore);
  private readonly routing = inject(RoutingStore);
  private readonly storage = inject(StorageService);
  private readonly brand = inject(BrandService);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly badges = inject(NavBadgesService).counts;

  protected readonly account = this.session.account;
  protected readonly collapsed = this.sidebar.isCollapsed;

  protected readonly traitement = inject(TraitementContext);
  protected readonly entites = ENTITES;
  protected readonly isTraitement = computed(() => this.session.role() === 'traitement');

  protected readonly menu = computed(() => {
    const role = this.session.role();
    if (!role) {
      return null;
    }
    const menu = NAVIGATION[role];
    if (role !== 'traitement') {
      return menu;
    }
    // L'agent ne voit que les écrans correspondant à ses fonctions dans l'entité.
    const functions = this.traitement.functions();
    return {
      ...menu,
      items: menu.items.filter((item) => !item.requires || functions[item.requires]),
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

  // Les groupes sont dépliés par défaut : on ne retient que ceux que l'utilisateur a repliés.
  private readonly closedGroups = signal<ReadonlySet<string>>(new Set());

  // Le repli ne concerne que les écrans larges : en tiroir mobile, les libellés restent visibles.
  protected readonly labelClass = computed(() => (this.collapsed() ? 'lg:hidden' : ''));
  protected readonly itemClass = computed(() =>
    this.collapsed() ? 'lg:justify-center lg:px-0' : '',
  );
  protected readonly nestedItemClass = computed(() =>
    this.collapsed() ? `ps-10 ${this.itemClass()}` : 'ps-10',
  );
  protected readonly asideClass = computed(() => {
    const width = this.collapsed() ? 'lg:w-[84px]' : 'lg:w-[280px]';
    const drawer = this.sidebar.isMobileOpen()
      ? 'translate-x-0 shadow-2xl'
      : '-translate-x-full max-lg:invisible';
    return `${width} ${drawer}`;
  });

  protected isGroupOpen(id: string): boolean {
    return !this.closedGroups().has(id);
  }

  protected toggleGroup(id: string): void {
    this.closedGroups.update((closed) => {
      const next = new Set(closed);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
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

  protected async resetDemo(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Réinitialiser les données de démo ?',
      text: 'Tous les dossiers et états créés pendant cette démonstration seront effacés.',
      okLabel: 'Réinitialiser',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.reset();
    this.routing.reset();
    void this.files.clear();
    this.clock.reset();
    this.storage.remove('atrad_notif_read_v1');
    this.brand.reset();
    this.theme.clearChoice();
    await this.router.navigate(['/']);
    this.toast.info('Données de démo réinitialisées.');
  }

  protected closeDrawer(): void {
    this.sidebar.setMobileOpen(false);
  }

  protected signOut(): void {
    this.closeDrawer();
    void this.session.signOutAndLeave();
  }
}
