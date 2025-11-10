import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/utils/pwa';

interface PWAFeatures {
  isOffline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  install: () => Promise<boolean>;
  share: (data: ShareData) => Promise<boolean>;
  vibrate: (pattern: number | number[]) => boolean;
  requestPersistentStorage: () => Promise<boolean>;
  estimateStorage: () => Promise<{ quota?: number; usage?: number; usagePercentage: number }>;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export function usePWAFeatures(): PWAFeatures {
  const isOnline = useNetworkStatus();
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true ||
                          document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkInstallStatus();
    window.addEventListener('resize', checkInstallStatus);
    return () => window.removeEventListener('resize', checkInstallStatus);
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    const handleServiceWorkerUpdate = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        setHasUpdate(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerUpdate);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerUpdate);
    };
  }, []);

  // Install app
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Share content
  const share = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!navigator.share) {
      // Fallback to clipboard
      try {
        const text = `${data.title || ''}\n${data.text || ''}\n${data.url || ''}`.trim();
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  }, []);

  // Vibrate device
  const vibrate = useCallback((pattern: number | number[]): boolean => {
    if (!navigator.vibrate) {
      return false;
    }

    try {
      navigator.vibrate(pattern);
      return true;
    } catch (error) {
      console.error('Error vibrating:', error);
      return false;
    }
  }, []);

  // Request persistent storage
  const requestPersistentStorage = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage?.persist) {
      return false;
    }

    try {
      const isPersistent = await navigator.storage.persist();
      return isPersistent;
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }, []);

  // Estimate storage usage
  const estimateStorage = useCallback(async (): Promise<{ quota?: number; usage?: number; usagePercentage: number }> => {
    if (!navigator.storage?.estimate) {
      return { usagePercentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

      return {
        quota,
        usage,
        usagePercentage
      };
    } catch (error) {
      console.error('Error estimating storage:', error);
      return { usagePercentage: 0 };
    }
  }, []);

  return {
    isOffline: !isOnline,
    isInstalled,
    canInstall,
    hasUpdate,
    install,
    share,
    vibrate,
    requestPersistentStorage,
    estimateStorage
  };
}

// Hook for handling offline file operations
export function useOfflineFiles() {
  const [offlineFiles, setOfflineFiles] = useState<Map<string, File>>(new Map());
  const [pendingUploads, setPendingUploads] = useState<File[]>([]);
  const isOnline = useNetworkStatus();

  // Save file for offline access
  const cacheFile = useCallback(async (file: File, id: string) => {
    try {
      // Store in IndexedDB for offline access
      const request = indexedDB.open('PWAFiles', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        store.put({
          id,
          file,
          timestamp: Date.now()
        });
      };

      setOfflineFiles(prev => new Map(prev.set(id, file)));
    } catch (error) {
      console.error('Error caching file:', error);
    }
  }, []);

  // Queue file for upload when back online
  const queueFileUpload = useCallback((file: File) => {
    setPendingUploads(prev => [...prev, file]);
  }, []);

  // Process pending uploads when back online
  useEffect(() => {
    if (isOnline && pendingUploads.length > 0) {
      // Process uploads
      console.log('Processing pending uploads:', pendingUploads);
      
      // Clear pending uploads after processing
      // This would integrate with your actual file upload logic
      setPendingUploads([]);
    }
  }, [isOnline, pendingUploads]);

  // Load cached files on mount
  useEffect(() => {
    const loadCachedFiles = async () => {
      try {
        const request = indexedDB.open('PWAFiles', 1);

        // Ensure object store exists during upgrade
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;

          // Verify object store exists before transaction
          if (!db.objectStoreNames.contains('files')) {
            console.warn('Files object store does not exist yet');
            return;
          }

          const transaction = db.transaction(['files'], 'readonly');
          const store = transaction.objectStore('files');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const files = getAllRequest.result;
            const fileMap = new Map();
            
            files.forEach(({ id, file }) => {
              fileMap.set(id, file);
            });
            
            setOfflineFiles(fileMap);
          };

          // Handle transaction errors
          transaction.onerror = (error) => {
            console.error('Transaction error:', error);
          };
        };

        // Handle database open errors
        request.onerror = (error) => {
          console.error('Error opening database:', error);
        };
      } catch (error) {
        console.error('Error loading cached files:', error);
      }
    };

    loadCachedFiles();
  }, []);

  return {
    offlineFiles,
    pendingUploads,
    cacheFile,
    queueFileUpload,
    hasOfflineFiles: offlineFiles.size > 0,
    hasPendingUploads: pendingUploads.length > 0
  };
}

// Hook for PWA-specific gestures and interactions
export function usePWAGestures() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isSwipeGesture, setIsSwipeGesture] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsSwipeGesture(false);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Detect swipe gesture
    if (deltaX > 50 || deltaY > 50) {
      setIsSwipeGesture(true);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setTimeout(() => setIsSwipeGesture(false), 100);
  }, []);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isSwipeGesture,
    touchStart
  };
}
