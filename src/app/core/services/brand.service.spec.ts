import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BRAND_DEFAULT, PALETTES, colorChange, paletteColors } from '../branding/brand';
import { Marque } from '../branding/marque.entity';
import { BrandService } from './brand.service';
import { ThemeService } from './theme.service';

const MARQUE: Marque = {
  configuration: {
    nomApplication: 'TraceBank',
    nomCourt: 'Trace Bank',
    organisation: '',
    palette: 'orange',
    couleurPrincipale: '#FF7518',
    couleurPrincipaleFoncee: '#CC5E13',
    couleurSecondaire: '#0B2942',
    couleurAccent: '#FFD1B3',
    couleurAccentClaire: '#FFF0E1',
    couleurFond: '#FFF0E1',
    couleurTexte: '#0B2942',
    police: 'Geist',
    rayon: 4,
    modeSombreParDefaut: false,
    vocabulaire: { tiers: 'Client', dossier: 'Demande' },
  },
  logoComplet: null,
  logoIcone: null,
  favicon: null,
  modifieLe: null,
};

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('BrandService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    localStorage.clear();
    root.removeAttribute('style');
    root.classList.remove('dark');
  });

  it('should apply the default brand when nothing is stored', () => {
    const service = TestBed.inject(BrandService);
    expect(service.appName()).toBe('YDXTrace — Démo');
    expect(service.initials()).toBe('Y');
    expect(root.style.getPropertyValue('--brand-primary')).toBe(BRAND_DEFAULT.primary);
    expect(root.style.getPropertyValue('--brand-border-radius')).toBe('10px');
  });

  it('should apply the brand read from the API, without keeping a local copy', async () => {
    const service = TestBed.inject(BrandService);
    const http = TestBed.inject(HttpTestingController);
    const done = service.refresh();
    http.expectOne('/api/v1/branding').flush({ success: true, data: MARQUE });
    await done;
    expect(service.initials()).toBe('TB');
    expect(service.brand().vocab).toEqual({ tiers: 'Client', dossier: 'Demande' });
    expect(root.style.getPropertyValue('--brand-primary')).toBe('#FF7518');
    expect(root.style.getPropertyValue('--brand-border-radius')).toBe('4px');
    expect(localStorage.getItem('atrad_brand_v1')).toBeNull();
  });

  it('should send the configuration, then the chosen logo, and reread the brand', async () => {
    const service = TestBed.inject(BrandService);
    const http = TestBed.inject(HttpTestingController);
    const logo = new File(['png'], 'logo.png', { type: 'image/png' });
    const done = service.save(
      {
        ...BRAND_DEFAULT,
        appName: 'TraceBank',
        shortName: 'Trace Bank',
        vocab: { tiers: 'Client', dossier: 'Demande' },
      },
      { logoFull: logo },
    );
    const put = http.expectOne(
      (request) => request.method === 'PUT' && request.url === '/api/v1/branding',
    );
    expect(put.request.body).toMatchObject({
      nomApplication: 'TraceBank',
      vocabulaire: { tiers: 'Client', dossier: 'Demande' },
    });
    put.flush({ success: true, data: MARQUE });
    await tick();
    const upload = http.expectOne('/api/v1/branding/logos/LOGO_COMPLET');
    expect(((upload.request.body as FormData).get('fichier') as File).name).toBe('logo.png');
    upload.flush({ success: true, data: MARQUE });
    await tick();
    http.expectOne('/api/v1/branding').flush({ success: true, data: MARQUE });
    await done;
    expect(service.appName()).toBe('TraceBank');
  });

  it('should derive the missing colours of a palette and of a custom primary', () => {
    const bleu = paletteColors(PALETTES.find((palette) => palette.id === 'bleu')!);
    expect(bleu.text).toBe(bleu.secondary);
    expect(bleu.accentLight).toBe('#E9EFFD');
    expect(colorChange('primary', '#ff7518')).toEqual({
      primary: '#FF7518',
      palette: 'custom',
      primaryDark: '#CC5E13',
      accentLight: '#FFF1E8',
    });
    expect(colorChange('accent', '#abcdef')).toEqual({ accent: '#ABCDEF', palette: 'custom' });
  });

  it('should use the brand dark default until the user picks a theme', async () => {
    const service = TestBed.inject(BrandService);
    const http = TestBed.inject(HttpTestingController);
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(false);
    const done = service.refresh();
    http.expectOne('/api/v1/branding').flush({
      success: true,
      data: { ...MARQUE, configuration: { ...MARQUE.configuration, modeSombreParDefaut: true } },
    });
    await done;
    theme.followBrandDefault();
    expect(theme.isDark()).toBe(true);

    theme.setTheme('light');
    theme.followBrandDefault();
    expect(theme.isDark()).toBe(false);

    theme.clearChoice();
    expect(theme.isDark()).toBe(true);
  });
});
