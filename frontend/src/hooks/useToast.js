import { useState, useCallback, useRef } from 'react';

const AUTO_DISMISS = { success: 2500, error: 4000, warning: 3000, info: 3000 };
const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
    timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS[type] ?? 3000);
    return id;
  }, [dismiss]);

  const hideToast = useCallback((id) => {
    if (id) dismiss(id);
    else setToasts([]);
  }, [dismiss]);

  // Backward compat: single toast object for old consumers
  const toast = toasts[toasts.length - 1] ?? null;

  return { toast, toasts, showToast, hideToast };
}
