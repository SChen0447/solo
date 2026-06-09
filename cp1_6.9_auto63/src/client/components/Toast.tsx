import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import './Toast.css';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          style={{ animation: 'slideUp 0.3s ease' }}
        >
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
          </div>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
