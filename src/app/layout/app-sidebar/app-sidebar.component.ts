import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAVIGATION } from '../../core/navigation/navigation';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { initialsOf } from '../../core/utils/text.util';
import { NavBadgesService } from '../../domains/notifications/nav-badges.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, IconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  private readonly session = inject(SessionService);
  protected readonly sidebar = inject(SidebarService);
  protected readonly badges = inject(NavBadgesService).counts;

  protected readonly account = this.session.account;
  protected readonly collapsed = this.sidebar.isCollapsed;

  protected readonly menu = computed(() => {
    const role = this.session.role();
    return role ? NAVIGATION[role] : null;
  });

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));

  // Les groupes sont dépliés par défaut : on ne retient que ceux que l'utilisateur a repliés.
  private readonly closedGroups = signal<ReadonlySet<string>>(new Set());

  // Le repli ne concerne que les écrans larges : en tiroir mobile, les libellés restent visibles.
  protected readonly labelClass = computed(() => (this.collapsed() ? 'lg:hidden' : ''));
  protected readonly itemClass = computed(() =>
    this.collapsed() ? 'lg:justify-center lg:px-0' : '',
  );
  protected readonly nestedItemClass = computed(() =>
    this.collapsed() ? this.itemClass() : 'ps-9',
  );
  protected readonly asideClass = computed(() => {
    const width = this.collapsed() ? 'lg:w-[72px]' : 'lg:w-[254px]';
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

  protected closeDrawer(): void {
    this.sidebar.setMobileOpen(false);
  }

  protected signOut(): void {
    this.closeDrawer();
    void this.session.signOutAndLeave();
  }
}
