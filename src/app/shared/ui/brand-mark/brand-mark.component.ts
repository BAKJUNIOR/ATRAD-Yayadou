import { Component, inject, input } from '@angular/core';
import { BrandService } from '../../../core/services/brand.service';

/**
 * Identité de l'application sur fond sombre. Sans logo : pastille aux initiales, nom et
 * organisation ; le logo complet les remplace, le logo icône remplace les initiales.
 */
@Component({
  selector: 'app-brand-mark',
  host: { class: 'flex min-w-0 items-center gap-3' },
  template: `
    @let brand = service.brand();
    @if (brand.logoFull && !compact()) {
      <img
        class="h-[34px] w-[190px] flex-none object-contain object-left"
        [src]="brand.logoFull"
        [alt]="service.appName()"
      />
    } @else {
      <span
        class="flex size-9 flex-none items-center justify-center overflow-hidden rounded-control bg-brand-mid text-[13px] font-bold text-brand-on-mid"
        aria-hidden="true"
      >
        @if (brand.logoIcon) {
          <img class="size-full bg-white object-contain" [src]="brand.logoIcon" alt="" />
        } @else {
          {{ service.initials() }}
        }
      </span>
      @if (!compact()) {
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-[14.5px] font-semibold tracking-[0.06em] text-white">
            {{ service.appName() }}
          </span>
          @if (brand.org) {
            <span class="truncate text-[10.5px] tracking-[0.12em] text-side-muted uppercase">
              {{ brand.org }}
            </span>
          }
        </span>
      } @else {
        <span class="sr-only">{{ service.appName() }}</span>
      }
    }
  `,
})
export class BrandMarkComponent {
  /** Pastille seule (barre latérale repliée). */
  readonly compact = input(false);

  protected readonly service = inject(BrandService);
}
