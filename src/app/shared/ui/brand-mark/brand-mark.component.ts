import { Component, booleanAttribute, inject, input } from '@angular/core';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-brand-mark',
  host: { class: 'flex min-w-0 items-center gap-3' },
  template: `
    @let brand = service.brand();
    @if (brand.logoFull && !compact()) {
      <img
        class="flex-none object-contain object-left"
        [class]="large() ? 'h-[50px] w-[270px]' : 'h-[42px] w-[225px]'"
        [src]="brand.logoFull"
        [alt]="service.appName()"
      />
    } @else {
      <span
        class="flex flex-none items-center justify-center overflow-hidden rounded-control bg-brand-mid font-bold text-brand-on-mid"
        [class]="large() ? 'size-13 text-[17px]' : 'size-11 text-[15px]'"
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
          <span
            class="truncate font-semibold tracking-[0.06em] text-white"
            [class]="large() ? 'text-[20px]' : 'text-[16.5px]'"
          >
            {{ service.appName() }}
          </span>
          @if (brand.org) {
            <span
              class="truncate tracking-[0.12em] text-side-muted uppercase"
              [class]="large() ? 'text-[12.5px]' : 'text-[11px]'"
            >
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
  readonly compact = input(false);
  readonly large = input(false, { transform: booleanAttribute });

  protected readonly service = inject(BrandService);
}
