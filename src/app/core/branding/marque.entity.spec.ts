import { Marque, brandFromMarque } from './marque.entity';

const marque: Marque = {
  configuration: {
    nomApplication: 'Traçabilité',
    nomCourt: 'Traça',
    organisation: null,
    palette: 'orange',
    couleurPrincipale: '#FF7518',
    couleurPrincipaleFoncee: '#CC5E13',
    couleurSecondaire: '#0B2942',
    couleurAccent: '#FFD1B3',
    couleurAccentClaire: '#FFF0E1',
    couleurFond: '#FFF0E1',
    couleurTexte: '#0B2942',
    police: 'Inter',
    rayon: 12,
    modeSombreParDefaut: true,
    vocabulaire: { tiers: 'Client', dossier: 'Demande' },
  },
  logoComplet: '/api/v1/branding/logos/LOGO_COMPLET?v=1a2b3c4d',
  logoIcone: null,
  favicon: null,
  modifieLe: null,
};

describe('brandFromMarque', () => {
  it('should map the API brand and resolve the logo paths', () => {
    const brand = brandFromMarque(marque, (path) => `https://api.exemple.test${path}`);
    expect(brand.appName).toBe('Traçabilité');
    expect(brand.org).toBe('');
    expect(brand.primary).toBe('#FF7518');
    expect(brand.background).toBe('#FFF0E1');
    expect(brand.font).toBe('Inter');
    expect(brand.radius).toBe(12);
    expect(brand.darkDefault).toBe(true);
    expect(brand.logoFull).toBe('https://api.exemple.test/api/v1/branding/logos/LOGO_COMPLET?v=1a2b3c4d');
    expect(brand.logoIcon).toBe('');
  });

  it('should fall back to the default font when the API sends an unknown one', () => {
    const brand = brandFromMarque(
      { ...marque, configuration: { ...marque.configuration, police: 'Comic Sans' } },
      (path) => path,
    );
    expect(brand.font).toBe('Geist');
  });
});
