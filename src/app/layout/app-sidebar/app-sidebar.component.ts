import { Location, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HOME, NAVIGATION, NavMenu, ROLE_CAPABILITY } from '../../core/navigation/navigation';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { initialsOf } from '../../core/utils/text.util';
import { ReceptionContext } from '../../domains/accueil/presentation/reception-context.service';
import { hasCapability } from '../../domains/dossiers/domain/referentiel';
import { ReferentielStore } from '../../domains/dossiers/infrastructure/store/referentiel.store';
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
  private readonly location = inject(Location);
  protected readonly sidebar = inject(SidebarService);
  protected readonly badges = inject(NavBadgesService).counts;

  protected readonly account = this.session.account;
  protected readonly collapsed = this.sidebar.isCollapsed;

  private readonly referentiel = inject(ReferentielStore);
  private readonly reception = inject(ReceptionContext);
  private readonly traitement = inject(TraitementContext);

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

  protected closeDrawer(): void {
    this.sidebar.setMobileOpen(false);
  }

  protected signOut(): void {
    this.closeDrawer();
    void this.session.signOutAndLeave();
  }
}
