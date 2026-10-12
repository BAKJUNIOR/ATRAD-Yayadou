import { Component } from '@angular/core';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

/** Mise en page des écrans hors session : panneau de marque à gauche, contenu projeté à droite. */
@Component({
  selector: 'app-auth-page-layout',
  imports: [BrandMarkComponent, ThemeToggleComponent],
  templateUrl: './auth-page-layout.component.html',
})
export class AuthPageLayoutComponent {
  protected readonly steps = [
    "Transmission depuis l'agence",
    "Réception et affectation par l'Accueil",
    'Instruction, validation, clôture',
    'Pilotage et respect des délais',
  ];
}
