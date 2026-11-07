import React from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  Sparkles, 
  CloudRain, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function InstallAppModal({
  isOpen,
  onClose,
  hasNativePrompt,
  isIOS,
  isInstalled,
  onTriggerInstall,
  onToast
}) {
  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    await onTriggerInstall((msg) => {
      onToast?.(msg);
      onClose();
    });
  };

  return (
    <div className="install-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="install-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="install-modal-close" onClick={onClose} aria-label="Close install modal">
          <X size={18} />
        </button>

        {/* Brand Icon & Ambient Glow */}
        <div className="install-app-icon-wrap">
          <div className="install-app-icon-glow" />
          <img 
            src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
            alt="Echoes App Icon" 
            className="install-app-icon-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `${import.meta.env.BASE_URL}brand-art.jpg`;
            }}
          />
        </div>

        <h3 className="install-modal-title">Install Echoes Sanctuary</h3>
        <p className="install-modal-desc">
          Add Echoes to your device home screen for a distraction-free, full-screen sanctuary experience with offline rain & reflection support.
        </p>

        {/* Feature Pills */}
        <div className="install-features-row">
          <div className="install-feature-pill">
            <Sparkles size={13} className="text-amber-400" />
            <span>Standalone Window</span>
          </div>
          <div className="install-feature-pill">
            <CloudRain size={13} className="text-sky-400" />
            <span>Offline Rain Access</span>
          </div>
          <div className="install-feature-pill">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>100% Anonymous</span>
          </div>
        </div>

        {/* State 1: Already Installed */}
        {isInstalled ? (
          <div className="install-already-installed">
            <CheckCircle2 size={24} className="text-emerald-400" />
            <div>
              <h4 className="install-installed-heading">Already Installed</h4>
              <p className="install-installed-sub">Echoes is running in standalone sanctuary mode.</p>
            </div>
          </div>
        ) : hasNativePrompt ? (
          /* State 2: 1-Click Native Install (Android / Desktop Chrome / Edge) */
          <div className="install-native-action-wrap">
            <button 
              type="button" 
              className="install-cta-btn"
              onClick={handleNativeInstall}
            >
              <Download size={18} />
              <span>Install to Home Screen</span>
              <ArrowRight size={16} />
            </button>
            <span className="install-native-hint">
              Tap above to install without using an app store. Zero permissions required.
            </span>
          </div>
        ) : isIOS ? (
          /* State 3: iOS Safari Instructions (iPhone / iPad) */
          <div className="install-ios-instructions">
            <div className="install-ios-header">
              <Smartphone size={16} className="text-amber-400" />
              <span>How to install on iPhone & iPad (Safari):</span>
            </div>

            <ol className="install-ios-steps">
              <li className="install-ios-step">
                <span className="step-num">1</span>
                <span className="step-text">
                  Tap the <strong>Share</strong> button <Share size={15} className="inline-icon text-sky-400" /> in Safari's bottom toolbar.
                </span>
              </li>
              <li className="install-ios-step">
                <span className="step-num">2</span>
                <span className="step-text">
                  Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={15} className="inline-icon text-amber-400" />.
                </span>
              </li>
              <li className="install-ios-step">
                <span className="step-num">3</span>
                <span className="step-text">
                  Tap <strong>Add</strong> in the top right corner. The sanctuary will appear on your home screen.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          /* State 4: Desktop Browser Instructions */
          <div className="install-desktop-instructions">
            <div className="install-desktop-header">
              <Download size={16} className="text-amber-400" />
              <span>Install from your browser bar</span>
            </div>
            <p className="install-desktop-text">
              Look for the <strong>Install / App Available</strong> icon <span className="inline-code">⊕</span> in the right side of your browser address bar, then click <strong>Install</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
