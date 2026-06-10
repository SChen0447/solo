import { useEffect, useState } from 'react';
import type { Toast as ToastType } from '@/types';

interface ToastContainerProps {
  toast: ToastType | null;
}

export function ToastContainer({ toast }: ToastContainerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast || !visible) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
