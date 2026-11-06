import { CanDeactivateFn } from '@angular/router';

export interface LeaveAware {
  canLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<LeaveAware> = (component) => component.canLeave();
