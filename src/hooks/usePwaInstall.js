import { useState, useEffect, useCallback } from 'react';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Check if running in standalone mode (already installed)
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      );
      setIsInstalled(Boolean(isStandalone));
    };

    checkInstalled();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => setIsInstalled(e.matches);
    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  // Listen for beforeinstallprompt event (Android / Chromium desktop)
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Device detection
  const isIOS = typeof navigator !== 'undefined' && (
    (/iPad|iPhone|iPod/.test(navigator.userAgent || '') && !window.MSStream) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  );

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');

  // Trigger installation flow
  const triggerInstall = useCallback(async (onSuccess) => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        onSuccess?.('✨ Echoes sanctuary installed to your device.');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Open informative modal for iOS or desktop instruction
      setIsInstallModalOpen(true);
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !isInstalled,
    isInstalled,
    isIOS,
    isAndroid,
    hasNativePrompt: Boolean(deferredPrompt),
    isInstallModalOpen,
    openInstallModal: () => setIsInstallModalOpen(true),
    closeInstallModal: () => setIsInstallModalOpen(false),
    triggerInstall
  };
}
