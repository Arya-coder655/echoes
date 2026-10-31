import React from 'react';
import { Sparkles, X } from 'lucide-react';

export default function Toast({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="toast-notification-wrap">
      <div className="toast-pill">
        <Sparkles size={16} className="toast-icon text-accent" />
        <span className="toast-text">{message}</span>
        <button onClick={onDismiss} className="toast-dismiss-btn" aria-label="Dismiss toast">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
