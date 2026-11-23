import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, Send } from 'lucide-react';

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or hostility', desc: 'Targeting or demeaning another soul.' },
  { id: 'inappropriate', label: 'Inappropriate or harmful words', desc: 'Content violating the emotional safety of the sanctuary.' },
  { id: 'spam', label: 'Spam or unsolicited links', desc: 'Advertising, repeated messages, or bots.' },
  { id: 'crisis', label: 'Immediate crisis or self-harm concern', desc: 'Needs compassionate guidance or helpline awareness.' },
  { id: 'other', label: 'Other sanctuary violation', desc: 'Doesn’t fit the categories above.' }
];

export default function CommentReportModal({ isOpen, onClose, comment, echo, onSubmitReport, onToast }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0].label);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !comment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReason || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmitReport(comment.id, echo?.id, selectedReason, details);
      onToast?.('Thank you for protecting the sanctuary. This reflection is under gentle review.');
      onClose();
    } catch {
      onToast?.('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div className="comment-report-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comment-report-header">
          <div className="report-title-row">
            <ShieldAlert size={20} className="text-rose-400" />
            <h3 className="report-modal-title">Gentle Guardian Report</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close report dialog">
            <X size={18} />
          </button>
        </div>

        {/* Comment quote context */}
        <div className="report-comment-preview">
          <span className="report-comment-author">Stranger reflected:</span>
          <p className="report-comment-quote">"{comment.text}"</p>
        </div>

        <form onSubmit={handleSubmit} className="report-form-body">
          <label className="report-section-label">Why are you reporting this reflection?</label>
          <div className="report-reasons-list">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`report-reason-item ${selectedReason === r.label ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="report_reason"
                  value={r.label}
                  checked={selectedReason === r.label}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="report-radio-input"
                />
                <div className="report-reason-info">
                  <span className="report-reason-name">{r.label}</span>
                  <span className="report-reason-desc">{r.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="report-details-group">
            <label htmlFor="report-details-input" className="report-section-label">
              Additional Context (Optional)
            </label>
            <textarea
              id="report-details-input"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide gentle context to help our guardians understand..."
              className="report-details-textarea"
              maxLength={400}
              rows={3}
            />
          </div>

          <div className="report-actions-row">
            <button type="button" className="minimal-cta-btn cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="minimal-cta-btn submit-report-btn"
            >
              <AlertTriangle size={15} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit to Guardians'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
