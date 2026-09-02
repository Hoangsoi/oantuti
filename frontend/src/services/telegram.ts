declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openTelegramLink: (url: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor('#0F172A');
      tg.setBackgroundColor('#0F172A');
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Safely waits for Telegram WebApp SDK initialization on iOS/Android WebViews.
 * Polls every 100ms up to maxRetries (default 20 = 2 seconds).
 * Ensures tg.ready() and tg.expand() are called when window.Telegram.WebApp is available.
 */
export function waitForTelegramSdk(
  maxRetries: number = 20,
  intervalMs: number = 100
): Promise<{ tg: any; initData: string }> {
  return new Promise((resolve) => {
    let retries = 0;

    const check = () => {
      const tg = getTelegramWebApp();
      if (tg) {
        try {
          tg.ready();
          tg.expand();
          tg.setHeaderColor('#0F172A');
          tg.setBackgroundColor('#0F172A');
        } catch (e) {
          // ignore styling errors
        }

        const initData = tg.initData || '';
        console.log('[Telegram] SDK detected');
        if (initData) {
          console.log('[Telegram] initData available');
        }

        // On iOS, if SDK exists but initData isn't populated yet, give it up to a few cycles
        if (initData || retries >= maxRetries) {
          resolve({ tg, initData });
          return;
        }
      }

      retries++;
      if (retries >= maxRetries) {
        console.log('[Telegram] Initialization timeout reached');
        resolve({ tg: tg || null, initData: tg?.initData || '' });
      } else {
        setTimeout(check, intervalMs);
      }
    };

    check();
  });
}

export function triggerHapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.impactOccurred(style);
    } catch (e) {
      // ignore
    }
  }
}

export function triggerHapticNotification(type: 'success' | 'error' | 'warning') {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.notificationOccurred(type);
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Opens Telegram Share URL with pre-filled text and targets valid URL.
 */
export function shareTelegramLink(targetUrl: string, text: string) {
  const tg = getTelegramWebApp();
  const validUrl = targetUrl || 'https://t.me/ottadmin2026';
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(validUrl)}&text=${encodeURIComponent(text)}`;

  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}

/**
 * Opens direct private chat with Admin Telegram Username.
 */
export function openTelegramDirectChat(username: string = 'ottadmin2026') {
  const tg = getTelegramWebApp();
  const cleanUsername = username.replace('@', '').replace('https://t.me/', '');
  const directUrl = `https://t.me/${cleanUsername}`;

  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(directUrl);
  } else {
    window.open(directUrl, '_blank');
  }
}
