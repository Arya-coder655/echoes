import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { reportEchoInDb } from '../utils/api';

const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate or explicit content' },
  { id: 'harassment', label: 'Harassment, hate speech, or bullying' },
  { id: 'spam', label: 'Spam, advertising, or suspicious links' },
  { id: 'self-harm', label: 'Self-harm or crisis concern' },
  { id: 'other', label: 'Other sanctuary guideline violation' }
];

export default function ReportModal({ isOpen, echo, onClose, onToast, onReportSubmitted }) {
  const [selectedReason, setSelectedReason] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !echo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const chosenLabel = REPORT_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;
    const res = await reportEchoInDb(echo.id, chosenLabel, details);

    setIsSubmitting(false);
    setSubmitted(true);
    if (onReportSubmitted) onReportSubmitted(echo.id);

    if (res.success) {
      if (onToast) onToast('Thank you. This echo has been submitted for review and removed.');
    } else {
      if (onToast) onToast('Report recorded locally and echo removed from your feed.');
    }

    setTimeout(() => {
      setSubmitted(false);
      setDetails('');
      onClose();
    }, 1400);
  };

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div 
        className="report-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div className="report-modal-header">
          <div className="report-header-title-wrap">
            <Flag size={20} className="text-rose-400" />
            <h3 id="report-modal-title" className="report-title">
              Report Echo <span className="report-target-id">#{echo.id}</span>
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="report-close-btn"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="report-success-state">
            <CheckCircle2 size={44} className="text-emerald-400" />
            <h4>Report Received</h4>
            <p>Thank you for keeping our sanctuary safe, kind, and compassionate.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-form">
            <div className="report-preview-box">
              <span className="report-preview-quote">“{echo.message.slice(0, 110)}{echo.message.length > 110 ? '...' : ''}”</span>
            </div>

            <p className="report-instruction">
              Select the reason why this echo violates sanctuary principles:
            </p>

            <div className="report-reasons-list">
              {REPORT_REASONS.map((r) => (
                <label 
                  key={r.id} 
                  className={`report-reason-item ${selectedReason === r.id ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div className="report-details-group">
              <label htmlFor="report-details">Additional context (optional):</label>
              <textarea
                id="report-details"
                rows={3}
                placeholder="Help us understand the issue..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={400}
              />
            </div>

            <div className="report-modal-footer">
              <button 
                type="button" 
                onClick={onClose}
                className="report-cancel-btn"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="report-submit-btn"
              >
                <AlertTriangle size={15} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
