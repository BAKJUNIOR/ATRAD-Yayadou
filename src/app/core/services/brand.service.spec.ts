import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BRAND_DEFAULT, PALETTES, colorChange, paletteColors } from '../branding/brand';
import { BrandService } from './brand.service';
import { ThemeService } from './theme.service';

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

  it('should save, apply and restore a brand', () => {
    const service = TestBed.inject(BrandService);
    const orange = PALETTES.find((palette) => palette.id === 'orange')!;
    const saved = service.save({
      ...BRAND_DEFAULT,
      ...paletteColors(orange),
      appName: 'TraceBank',
      shortName: 'Trace Bank',
      radius: 4,
    });
    expect(saved).toBe(true);
    expect(service.initials()).toBe('TB');
    expect(root.style.getPropertyValue('--brand-primary')).toBe('#FF7518');
    expect(root.style.getPropertyValue('--brand-border-radius')).toBe('4px');
    expect(JSON.parse(localStorage.getItem('atrad_brand_v1')!).appName).toBe('TraceBank');

    service.reset();
    expect(service.appName()).toBe('YDXTrace — Démo');
    expect(localStorage.getItem('atrad_brand_v1')).toBeNull();
    expect(root.style.getPropertyValue('--brand-primary')).toBe(BRAND_DEFAULT.primary);
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

  it('should use the brand dark default until the user picks a theme', () => {
    localStorage.setItem('atrad_brand_v1', JSON.stringify({ darkDefault: true }));
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(true);

    theme.setTheme('light');
    theme.followBrandDefault();
    expect(theme.isDark()).toBe(false);

    theme.clearChoice();
    expect(theme.isDark()).toBe(true);
  });
});
