import React, { useState, useCallback } from 'react';
import './Toast.css';

// Toast 인스턴스 저장소
let toastStack = [];
let toastListener = null;

const setToastListener = (listener) => {
  toastListener = listener;
};

export const showToast = (message, type = 'info', duration = 3000) => {
  const id = Date.now();
  const toast = { id, message, type };

  toastStack.push(toast);
  if (toastListener) {
    toastListener([...toastStack]);
  }

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
};

const removeToast = (id) => {
  toastStack = toastStack.filter((t) => t.id !== id);
  if (toastListener) {
    toastListener([...toastStack]);
  }
};

/**
 * Toast 컨테이너 컴포넌트
 */
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  React.useEffect(() => {
    setToastListener(setToasts);
    return () => setToastListener(null);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * 개별 Toast 컴포넌트
 */
const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};

export default ToastContainer;
