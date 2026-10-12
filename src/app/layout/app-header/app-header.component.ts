import { Dialog } from '@angular/cdk/dialog';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DemoClock } from '../../core/services/demo-clock.service';
import { SessionService } from '../../core/services/session.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { initialsOf } from '../../core/utils/text.util';
import {
  AppNotification,
  NotificationTone,
  NotificationsService,
} from '../../domains/notifications/notifications.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ProfileDialogComponent } from '../../shared/ui/profile-dialog/profile-dialog.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

/** Largeur à partir de laquelle la barre latérale est fixe (point de rupture `lg`). */
const DESKTOP_QUERY = '(min-width: 1024px)';

const UNREAD_DOT: Record<NotificationTone, string> = {
  info: 'bg-brand-mid',
  warn: 'bg-warning-dot',
  danger: 'bg-danger-solid',
};

@Component({
  selector: 'app-header',
  imports: [IconComponent, ThemeToggleComponent],
  host: {
    '(document:keydown.escape)': 'closeMenus()',
    '(document:keydown)': 'onShortcut($event)',
  },
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly clock = inject(DemoClock);
  protected readonly sidebar = inject(SidebarService);
  protected readonly notifications = inject(NotificationsService);

  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly account = this.session.account;

  protected readonly bellOpen = signal(false);
  protected readonly profileOpen = signal(false);

  protected readonly initials = computed(() => initialsOf(this.account()?.name ?? ''));
  protected readonly toggleLabel = computed(() =>
    this.sidebar.isCollapsed() ? 'Déplier le menu' : 'Replier le menu',
  );
  protected readonly bellLabel = computed(() => {
    const unread = this.notifications.unreadCount();
    return unread ? `Notifications, ${unread} non lue(s)` : 'Notifications';
  });

  /** `Lundi 12 octobre 2026` ; suit la date de démonstration. */
  protected readonly today = computed(() => {
    const text = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${this.clock.today()}T00:00:00`));
    return text.charAt(0).toUpperCase() + text.slice(1);
  });

  /** Replie la barre latérale sur grand écran, ouvre le tiroir sur petit écran. */
  protected toggleSidebar(): void {
    this.closeMenus();
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      this.sidebar.toggleCollapsed();
    } else {
      this.sidebar.setMobileOpen(!this.sidebar.isMobileOpen());
    }
  }

  /** Ctrl + K (ou ⌘ + K) place le curseur dans la recherche. */
  protected onShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    }
  }

  protected dotClass(notification: AppNotification): string {
    return notification.read ? 'bg-line-strong' : UNREAD_DOT[notification.tone];
  }

  protected toggleBell(): void {
    this.profileOpen.set(false);
    this.bellOpen.update((open) => !open);
  }

  protected toggleProfile(): void {
    this.bellOpen.set(false);
    this.profileOpen.update((open) => !open);
  }

  protected closeMenus(): void {
    this.bellOpen.set(false);
    this.profileOpen.set(false);
  }

  protected openNotification(notification: AppNotification): void {
    this.notifications.markRead(notification.id);
    this.closeMenus();
    void this.router.navigateByUrl(notification.path);
  }

  protected openProfile(): void {
    this.closeMenus();
    this.dialog.open(ProfileDialogComponent, {
      ariaLabel: 'Mon profil',
      backdropClass: 'app-dialog-backdrop',
    });
  }

  protected signOut(): void {
    this.closeMenus();
    void this.session.signOutAndLeave();
  }
}
