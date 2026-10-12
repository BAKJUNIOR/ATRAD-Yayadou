import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-theme-toggle',
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="flex size-9 flex-none items-center justify-center rounded-control border border-line-strong bg-card text-ink-secondary transition-colors hover:border-brand hover:text-brand-ink"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      (click)="theme.toggleTheme()"
    >
      <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="17" [strokeWidth]="2" />
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly label = computed(() =>
    this.theme.isDark() ? 'Passer en mode clair' : 'Passer en mode sombre',
  );
}
