import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastData | null>(null);
  toast$ = this.toastSubject.asObservable();
  private timeoutHandle: any;

  show(message: string, type: ToastType = 'success', duration = 3000) {
    this.toastSubject.next({ message, type });

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    this.timeoutHandle = setTimeout(() => {
      this.toastSubject.next(null);
    }, duration);
  }

  clear() {
    this.toastSubject.next(null);
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
  }
}
