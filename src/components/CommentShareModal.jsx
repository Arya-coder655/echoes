import React, { useRef, useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Download, ExternalLink, Sparkles } from 'lucide-react';

export default function CommentShareModal({ isOpen, onClose, comment, echo, onToast }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [graphicUrl, setGraphicUrl] = useState(null);
  const canvasRef = useRef(null);

  const commentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#echo-${echo?.id}?comment=${comment?.id}`
    : '';

  useEffect(() => {
    if (isOpen && comment && echo) {
      generateGraphic();
    }
    return () => {
      if (graphicUrl) URL.revokeObjectURL(graphicUrl);
    };
  }, [isOpen, comment, echo]);

  if (!isOpen || !comment || !echo) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(commentUrl);
      setCopiedLink(true);
      onToast?.('Deep link to this reflection copied to clipboard.');
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      onToast?.('Failed to copy link.');
    }
  };

  const handleCopyText = async () => {
    const textToCopy = `"${comment.text}"\n— A Stranger on Echoes\n${commentUrl}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      onToast?.('Reflection quote copied.');
      setTimeout(() => setCopiedText(false), 2200);
    } catch {
      onToast?.('Failed to copy text.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reflection on Echoes`,
          text: `"${comment.text}"\n— A Stranger on Echoes`,
          url: commentUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') onToast?.('Could not open share menu.');
      }
    } else {
      handleCopyLink();
    }
  };

  const generateGraphic = () => {
    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Midnight Background
    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 700);
    bgGradient.addColorStop(0, '#1c1527');
    bgGradient.addColorStop(0.5, '#120f1c');
    bgGradient.addColorStop(1, '#07060a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle warm ambient glow in top-right and bottom-left
    const glow1 = ctx.createRadialGradient(width * 0.85, height * 0.15, 20, width * 0.85, height * 0.15, 450);
    glow1.addColorStop(0, 'rgba(252, 41, 4, 0.22)');
    glow1.addColorStop(1, 'rgba(252, 41, 4, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 20, width * 0.15, height * 0.85, 450);
    glow2.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
    glow2.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // 3. Card Container with glowing border
    const cardX = 90;
    const cardY = 120;
    const cardW = width - 180;
    const cardH = height - 240;
    const radius = 32;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.lineWidth = 3;
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, 'rgba(252, 41, 4, 0.6)');
    borderGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.7)');
    borderGrad.addColorStop(1, 'rgba(255, 112, 79, 0.4)');
    ctx.strokeStyle = borderGrad;
    ctx.stroke();
    ctx.restore();

    // 4. Header: Logo & Recipient
    ctx.fillStyle = '#FC2904';
    ctx.beginPath();
    ctx.arc(cardX + 60, cardY + 70, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.letterSpacing = '3px';
    ctx.fillText('ECHOES', cardX + 80, cardY + 78);

    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.letterSpacing = '1px';
    const recipientText = echo.name || 'To: The Universe';
    ctx.fillText(recipientText.slice(0, 36), cardX + 60, cardY + 125);

    // 5. Echo snippet quote
    if (echo.message) {
      ctx.font = 'italic 20px Georgia, serif';
      ctx.fillStyle = '#94a3b8';
      const snippet = `Whisper: "${echo.message.slice(0, 75)}${echo.message.length > 75 ? '…' : ''}"`;
      ctx.fillText(snippet, cardX + 60, cardY + 165);
    }

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, cardY + 200);
    ctx.lineTo(cardX + cardW - 60, cardY + 200);
    ctx.stroke();

    // 6. Comment Text (word-wrapped)
    ctx.font = '34px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#f8fafc';
    const maxWidth = cardW - 120;
    const lineHeight = 50;
    const words = (comment.text || '').split(' ');
    let line = '';
    let y = cardY + 270;
    const maxY = cardY + cardH - 180;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        if (y + lineHeight > maxY) {
          ctx.fillText(line.trim() + '…', cardX + 60, y);
          line = '';
          break;
        }
        ctx.fillText(line, cardX + 60, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, cardX + 60, y);
    }

    // 7. Author signature
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('— An Anonymous Stranger', cardX + 60, cardY + cardH - 100);

    // 8. Footer Tagline
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.fillText('“Every Echo deserves to be heard.”', cardX + 60, cardY + cardH - 55);

    // Convert to image blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setGraphicUrl(url);
      }
      setIsGenerating(false);
    }, 'image/png');
  };

  const handleDownloadGraphic = () => {
    if (!graphicUrl) return;
    const a = document.createElement('a');
    a.href = graphicUrl;
    a.download = `echo-reflection-${comment.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast?.('Reflection graphic downloaded.');
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div className="comment-share-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comment-share-header">
          <div className="share-title-row">
            <Share2 size={20} className="text-amber-400" />
            <h3 className="share-modal-title">Share this Reflection</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close share dialog">
            <X size={18} />
          </button>
        </div>

        {/* Graphic Preview */}
        <div className="comment-graphic-preview-container">
          {graphicUrl ? (
            <img src={graphicUrl} alt="Reflection Graphic Preview" className="comment-graphic-img" />
          ) : (
            <div className="comment-graphic-skeleton">
              <Sparkles className="animate-spin text-amber-400" size={28} />
              <span>Crafting high-resolution graphic...</span>
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="comment-share-actions-grid">
          <button
            type="button"
            className="share-action-tile highlight"
            onClick={handleDownloadGraphic}
            disabled={!graphicUrl}
          >
            <Download size={18} />
            <span>Download Graphic</span>
          </button>

          <button type="button" className="share-action-tile" onClick={handleCopyLink}>
            {copiedLink ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Deep Link'}</span>
          </button>

          <button type="button" className="share-action-tile" onClick={handleCopyText}>
            {copiedText ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
            <span>{copiedText ? 'Text Copied!' : 'Copy Quote Text'}</span>
          </button>

          {typeof navigator !== 'undefined' && Boolean(navigator.share) && (
            <button type="button" className="share-action-tile" onClick={handleNativeShare}>
              <ExternalLink size={18} />
              <span>Share to Apps</span>
            </button>
          )}
        </div>

        <div className="share-deep-link-preview">
          <span className="deep-link-label">Deep link:</span>
          <code className="deep-link-text">{commentUrl}</code>
        </div>
      </div>
    </div>
  );
}
