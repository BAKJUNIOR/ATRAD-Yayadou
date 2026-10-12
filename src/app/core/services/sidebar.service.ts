import { Service, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

const SIDEBAR_KEY = 'atrad_side_v1';

@Service()
export class SidebarService {
  private readonly storage = inject(StorageService);

  private readonly collapsedState = signal(this.storage.get<boolean>(SIDEBAR_KEY) === true);
  private readonly mobileOpenState = signal(false);

  /** Barre repliée en icônes (écrans larges). */
  readonly isCollapsed = this.collapsedState.asReadonly();
  /** Tiroir ouvert (écrans étroits). */
  readonly isMobileOpen = this.mobileOpenState.asReadonly();

  toggleCollapsed(): void {
    this.collapsedState.update((collapsed) => !collapsed);
    this.storage.set(SIDEBAR_KEY, this.collapsedState());
  }

  setMobileOpen(open: boolean): void {
    this.mobileOpenState.set(open);
  }
}
