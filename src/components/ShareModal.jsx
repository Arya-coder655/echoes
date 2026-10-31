import React, { useState, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Download, 
  ExternalLink 
} from 'lucide-react';
import { THEME_PALETTES } from '../data/initialEchoes';

export default function ShareModal({ isOpen, echo, onClose, onShareSuccess, onToast }) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  if (!isOpen || !echo) return null;

  const currentTheme = THEME_PALETTES.find((t) => t.id === echo.themeId) || THEME_PALETTES[0];
  const shareUrl = `${window.location.origin}${window.location.pathname}#${echo.id}`;
  const shareTitle = `Echo of the Heart: "${echo.message.slice(0, 70)}..."`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    onToast('Link copied to clipboard!');
    onShareSuccess(echo.id);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSocialClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onShareSuccess(echo.id);
  };

  // Generate aesthetic image card for download
  const handleDownloadImageCard = () => {
    setIsGeneratingImg(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, '#0a0a0f');
      bgGrad.addColorStop(0.5, '#13111c');
      bgGrad.addColorStop(1, '#07070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Outer glow border
      ctx.strokeStyle = currentTheme.border || 'rgba(252, 41, 4, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 1000, 1000);

      // Inner card container
      ctx.fillStyle = 'rgba(25, 23, 34, 0.9)';
      ctx.fillRect(80, 80, 920, 920);

      // Top Header text
      ctx.fillStyle = currentTheme.color || '#ff4b2b';
      ctx.font = 'bold 36px "Poppins", sans-serif';
      ctx.fillText('ECHOES OF THE HEART', 130, 160);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px "Poppins", sans-serif';
      ctx.fillText(`ANONYMOUS SANCTUARY • #${echo.id}`, 130, 205);

      // Recipient
      if (echo.name) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'italic 30px "Poppins", sans-serif';
        ctx.fillText(`${echo.name}`, 130, 270);
      }

      // Decorative Quote mark
      ctx.fillStyle = currentTheme.color || '#ff4b2b';
      ctx.font = 'bold 120px "Georgia", serif';
      ctx.fillText('“', 120, 390);

      // Word-wrapped Message Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '34px "Poppins", sans-serif';
      const maxWidth = 800;
      const lineHeight = 52;
      const words = echo.message.split(' ');
      let line = '';
      let y = 430;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 130, y);
          line = words[n] + ' ';
          y += lineHeight;
          if (y > 860) {
            line += '...';
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 130, y);

      // Footer brand watermark
      ctx.fillStyle = '#64748b';
      ctx.font = '22px "Poppins", sans-serif';
      ctx.fillText('Share your unspoken story at EchoesOfTheHeart', 130, 940);

      const downloadLink = document.createElement('a');
      downloadLink.download = `echo-${echo.id}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
      onShareSuccess(echo.id);
      onToast('Echo image downloaded successfully!');
    } catch (err) {
      console.error(err);
      onToast('Failed to render image.');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div 
        className="share-modal-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          '--theme-color': currentTheme.color
        }}
      >
        <div className="share-modal-header">
          <div className="share-modal-title-wrap">
            <Share2 size={20} className="text-accent" />
            <h3 className="share-modal-title">Share this Echo</h3>
          </div>
          <button className="share-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="share-modal-desc">
          Let this unspoken thought resonate with the world.
        </p>

        {/* Copy Link Bar */}
        <div className="share-copy-box">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="share-url-input"
          />
          <button
            onClick={handleCopy}
            className={`share-copy-button ${copied ? 'copied' : ''}`}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="social-grid">
          <button
            onClick={() =>
              handleSocialClick(
                `https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `${shareTitle}\n\n${shareUrl}`
                )}`
              )
            }
            className="social-btn whatsapp-btn"
          >
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() =>
              handleSocialClick(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  shareTitle
                )}&url=${encodeURIComponent(shareUrl)}`
              )
            }
            className="social-btn x-twitter-btn"
          >
            <span>X (Twitter)</span>
          </button>

          <button
            onClick={() =>
              handleSocialClick(
                `https://t.me/share/url?url=${encodeURIComponent(
                  shareUrl
                )}&text=${encodeURIComponent(shareTitle)}`
              )
            }
            className="social-btn telegram-btn"
          >
            <span>Telegram</span>
          </button>

          <button
            onClick={() =>
              handleSocialClick(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  shareUrl
                )}`
              )
            }
            className="social-btn facebook-btn"
          >
            <span>Facebook</span>
          </button>
        </div>

        {/* Download as Image Card */}
        <div className="share-extra-action">
          <button
            onClick={handleDownloadImageCard}
            disabled={isGeneratingImg}
            className="download-card-btn"
          >
            <Download size={16} />
            <span>{isGeneratingImg ? 'Rendering Card...' : 'Save as Aesthetic Quote Card (PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
