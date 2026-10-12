import { CanDeactivateFn } from '@angular/router';

/** Écran dont la saisie en cours doit être confirmée avant d'être quittée. */
export interface LeaveAware {
  canLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<LeaveAware> = (component) => component.canLeave();
