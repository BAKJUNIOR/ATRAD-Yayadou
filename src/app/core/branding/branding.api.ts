import { Service, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseService } from '../services/base.service';
import { Brand } from './brand';
import { Marque, brandFromMarque } from './marque.entity';

/** Délai au-delà duquel l'application démarre avec la marque gardée en mémoire. */
const STARTUP_TIMEOUT_MS = 4000;

/** Marque blanche servie par l'API, lisible sans être connecté (écran de connexion compris). */
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
}
