import React, { useEffect, useState } from 'react';

const TYPE_STYLES = {
  info:    { background: '#5b6ef5', color: '#fff' },
  success: { background: '#38a169', color: '#fff' },
  error:   { background: '#e53e3e', color: '#fff' },
  warning: { background: '#dd6b20', color: '#fff' },
};

export default function Toast({ toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  const typeStyle = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s ease',
        zIndex: 9999,
        ...typeStyle,
        padding: '12px 24px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        maxWidth: 320,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {toast.message}
    </div>
  );
}
