import React, { useState, useCallback } from 'react';
import './Modal.css';

/**
 * 모달 컴포넌트
 */
const Modal = ({
  isOpen,
  title,
  children,
  onClose,
  actions,
  size = 'md',
  closeButton = true,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal modal-${size}`}>
        {closeButton && (
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        )}

        {title && <h2 className="modal-title">{title}</h2>}

        <div className="modal-content">{children}</div>

        {actions && <div className="modal-footer">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
