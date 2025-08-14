// Simple toast notification system
class ToastManager {
  private toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }> = [];
  private listeners: Array<(toasts: typeof this.toasts) => void> = [];

  subscribe(listener: (toasts: typeof this.toasts) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  success(message: string) {
    const id = Date.now().toString();
    this.toasts.push({ id, message, type: 'success' });
    this.notify();
    setTimeout(() => this.remove(id), 3000);
  }

  error(message: string) {
    const id = Date.now().toString();
    this.toasts.push({ id, message, type: 'error' });
    this.notify();
    setTimeout(() => this.remove(id), 5000);
  }

  info(message: string) {
    const id = Date.now().toString();
    this.toasts.push({ id, message, type: 'info' });
    this.notify();
    setTimeout(() => this.remove(id), 3000);
  }

  private remove(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }
}

const toastManager = new ToastManager();

export const toast = {
  success: (message: string) => toastManager.success(message),
  error: (message: string) => toastManager.error(message),
  info: (message: string) => toastManager.info(message),
  subscribe: (listener: (toasts: any[]) => void) => toastManager.subscribe(listener)
};