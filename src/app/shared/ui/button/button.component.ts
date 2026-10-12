import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors active:translate-y-px';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-navy text-white hover:bg-brand',
  danger: 'bg-danger-solid text-white hover:brightness-90',
  outline:
    'border border-line-strong bg-card text-ink-secondary hover:border-brand hover:text-brand-ink',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-[12.5px]',
  md: 'px-4 py-2.5 text-[13.5px]',
};

/** S'applique sur un élément natif : `<button appButton>` ou `<a appButton routerLink="…">`. */
@Component({
  selector: 'button[appButton], a[appButton]',
  host: { '[class]': 'classes()' },
  template: `<ng-content />`,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(
    () => `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]}`,
  );
}
