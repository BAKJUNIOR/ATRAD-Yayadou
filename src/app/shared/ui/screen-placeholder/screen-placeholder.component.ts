import { Component, inject } from '@angular/core';
import { PageTitleStrategy } from '../../../core/services/page-title.strategy';
import { IconComponent } from '../icon/icon.component';

/**
 * Occupe la route d'un écran pas encore construit, pour que la navigation et les droits
 * d'accès soient testables de bout en bout. À remplacer par la page du domaine concerné.
 */
@Component({
  selector: 'app-screen-placeholder',
  imports: [IconComponent],
  template: `
    <section
      class="flex animate-enter flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong bg-card px-6 py-16 text-center"
    >
      <span
        class="flex size-11 items-center justify-center rounded-brand bg-brand-tint text-brand-ink"
      >
        <app-icon name="layers" [size]="20" />
      </span>
      <h1 class="text-[18px] font-semibold tracking-[-0.01em] text-ink">{{ pageTitle() }}</h1>
      <p class="max-w-md text-[13.5px] text-pretty text-ink-muted">
        Cet écran n'est pas encore construit. Sa route, son entrée de menu et ses droits d'accès
        sont déjà en place.
      </p>
    </section>
  `,
})
export class ScreenPlaceholderComponent {
  protected readonly pageTitle = inject(PageTitleStrategy).pageTitle;
}
