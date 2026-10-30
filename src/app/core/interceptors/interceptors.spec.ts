import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BaseService } from '../services/base.service';
import { SessionService } from '../services/session.service';
import { ToastService } from '../services/toast.service';
import { ApiError } from '../utils/api-error.util';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

const ACCOUNT = {
  id: 'u-1',
  role: 'agence' as const,
  roles: ['agence' as const],
  ident: 'a.diallo',
  name: 'Aminata Diallo',
  roleLabel: 'Entité émettrice — Agence Plateau',
  entity: 'Agence Plateau (AG-014)',
  entityId: 'e-1',
};

describe('API interceptors', () => {
  let http: HttpTestingController;
  let api: BaseService;
  let session: SessionService;
  let toast: ToastService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(BaseService);
    session = TestBed.inject(SessionService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  it('should send the session token and unwrap the response', () => {
    session.signIn('jeton-1', ACCOUNT);
    let data: unknown;
    api.getOne<{ ok: boolean }>('/api/v1/moi').subscribe((value) => (data = value));

    const request = http.expectOne('/api/v1/moi');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jeton-1');
    request.flush({ success: true, data: { ok: true } });
    expect(data).toEqual({ ok: true });
  });

  it('should not send the token to a public call and use an explicit token when given', () => {
    session.signIn('jeton-1', ACCOUNT);
    api.getOne('/api/v1/branding', undefined, { withoutToken: true }).subscribe();
    api.getOne('/api/v1/moi', undefined, { token: 'jeton-2' }).subscribe();

    expect(http.expectOne('/api/v1/branding').request.headers.has('Authorization')).toBe(false);
    expect(http.expectOne('/api/v1/moi').request.headers.get('Authorization')).toBe(
      'Bearer jeton-2',
    );
  });

  it('should turn an API error into an ApiError shown as a toast', () => {
    session.signIn('jeton-1', ACCOUNT);
    let error: ApiError | undefined;
    api.create('/api/v1/brouillon/dossiers', {}).subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne('/api/v1/brouillon/dossiers').flush(
      {
        success: false,
        message: 'Certaines données envoyées sont invalides',
        errorCode: 'VALIDATION_ECHOUEE',
        data: [{ champ: 'tiersNom', message: 'ne doit pas être vide' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(error?.code).toBe('VALIDATION_ECHOUEE');
    expect(error?.fields).toEqual([{ champ: 'tiersNom', message: 'ne doit pas être vide' }]);
    expect(toast.toasts()[0]?.message).toBe(
      'Certaines données envoyées sont invalides : ne doit pas être vide',
    );
  });

  it('should keep a silent error off the toasts', () => {
    api
      .getOne('/api/v1/branding', undefined, { silentErrors: true })
      .subscribe({ error: () => undefined });
    http.expectOne('/api/v1/branding').flush(null, { status: 500, statusText: 'Erreur' });
    expect(toast.toasts()).toEqual([]);
  });

  it('should close the session when the token is refused', () => {
    session.signIn('jeton-1', ACCOUNT);
    api.getOne('/api/v1/moi').subscribe({ error: () => undefined });
    http
      .expectOne('/api/v1/moi')
      .flush(
        {
          success: false,
          message: 'Authentification requise ou jeton invalide',
          errorCode: 'NON_AUTHENTIFIE',
        },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(session.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/signin']);
  });

  it('should keep the session on a refused sign-in (public call)', () => {
    session.signIn('jeton-1', ACCOUNT);
    api
      .create('/api/v1/auth/login', {}, { withoutToken: true, silentErrors: true })
      .subscribe({ error: () => undefined });
    http
      .expectOne('/api/v1/auth/login')
      .flush(
        {
          success: false,
          message: 'Identifiant ou mot de passe incorrect',
          errorCode: 'IDENTIFIANTS_INVALIDES',
        },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(session.isAuthenticated()).toBe(true);
  });

  it('should report an unreachable server', () => {
    let error: ApiError | undefined;
    api.getOne('/api/v1/moi').subscribe({ error: (e: ApiError) => (error = e) });
    http.expectOne('/api/v1/moi').error(new ProgressEvent('error'), { status: 0 });
    expect(error?.code).toBe('SERVEUR_INJOIGNABLE');
  });
});
