import { Service, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  message: string;
}

const TOAST_DURATION_MS = 2600;

@Service()
export class ToastService {
  private nextId = 0;
  private readonly messages = signal<ToastMessage[]>([]);

  readonly toasts = this.messages.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  warning(message: string): void {
    this.push('warning', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.messages.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(variant: ToastVariant, message: string): void {
    const id = this.nextId++;
    // Un seul message à la fois : le dernier remplace le précédent.
    this.messages.set([{ id, variant, message }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
