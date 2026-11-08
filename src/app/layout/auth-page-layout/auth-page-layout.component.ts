import { Component } from '@angular/core';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-auth-page-layout',
  imports: [BrandMarkComponent, ThemeToggleComponent],
  templateUrl: './auth-page-layout.component.html',
})
export class AuthPageLayoutComponent {}
