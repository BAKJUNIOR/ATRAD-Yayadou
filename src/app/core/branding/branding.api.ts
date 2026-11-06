import { Service, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseService } from '../services/base.service';
import { Brand, BrandLogoKey } from './brand';
import { ConfigurationMarque, Marque, brandFromMarque } from './marque.entity';

/** Délai au-delà duquel l'application démarre avec la marque gardée en mémoire. */
const STARTUP_TIMEOUT_MS = 4000;

const LOGO_TYPE: Record<BrandLogoKey, string> = {
  logoFull: 'LOGO_COMPLET',
  logoIcon: 'LOGO_ICONE',
  favicon: 'FAVICON',
};

@Service()
export class BrandingApi {
  private readonly baseService = inject(BaseService);
  private readonly url = environment.endpoints.branding;

  brand(): Observable<Brand> {
    return this.baseService
      .getOne<Marque>(this.url.base, undefined, { withoutToken: true, silentErrors: true })
      .pipe(
        timeout(STARTUP_TIMEOUT_MS),
        map((marque) => brandFromMarque(marque, (path) => this.baseService.url(path))),
      );
  }

  modifier(configuration: ConfigurationMarque): Observable<Marque> {
    return this.baseService.update<Marque>(this.url.base, configuration);
  }

  reinitialiser(): Observable<Marque> {
    return this.baseService.delete<Marque>(this.url.base);
  }

  deposerLogo(key: BrandLogoKey, file: File): Observable<Marque> {
    return this.baseService.upload<Marque>('PUT', this.url.logo(LOGO_TYPE[key]), file);
  }

  retirerLogo(key: BrandLogoKey): Observable<Marque> {
    return this.baseService.delete<Marque>(this.url.logo(LOGO_TYPE[key]));
  }
}
