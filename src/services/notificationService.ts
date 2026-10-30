export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  timestamp: string;
}

type NotificationListener = (notification: ToastNotification) => void;

let listeners: NotificationListener[] = [];

export const notificationService = {
  subscribe: (listener: NotificationListener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  show: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const notification: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      message,
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    listeners.forEach((l) => l(notification));
  },
};
