// PWA utilities for service worker registration and management

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private updateAvailable = false;

  constructor() {
    this.init();
  }

  private init() {
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt.bind(this));
    
    // Listen for app installed
    window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
    
    // Register service worker
    this.registerServiceWorker();
  }

  private checkInstallStatus() {
    // Check if running as PWA
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes('android-app://');
  }

  private handleBeforeInstallPrompt(e: Event) {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Show install button or banner
    this.showInstallPrompt();
  }

  private handleAppInstalled() {
    console.log('PWA was installed');
    this.isInstalled = true;
    this.deferredPrompt = null;
    
    // Hide install prompt
    this.hideInstallPrompt();
    
    // Track installation
    this.trackEvent('pwa_installed');
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('Service Worker registered successfully:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                this.updateAvailable = true;
                this.showUpdatePrompt();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
            this.updateAvailable = true;
            this.showUpdatePrompt();
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      // Track the outcome
      this.trackEvent('pwa_install_prompt', { outcome });
      
      // Clear the deferredPrompt
      this.deferredPrompt = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  private showInstallPrompt() {
    // Create install banner
    const banner = this.createInstallBanner();
    document.body.appendChild(banner);
  }

  private hideInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
  }

  private createInstallBanner(): HTMLElement {
    // Remove existing banner
    this.hideInstallPrompt();

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 400px;
      margin: 0 auto;
    `;

    banner.innerHTML = `
      <div style="flex: 1; margin-right: 16px;">
        <div style="font-weight: 600; margin-bottom: 4px;">Install AI Projects</div>
        <div style="font-size: 14px; opacity: 0.9;">Add to your home screen for quick access</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-install-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
          background: transparent;
          border: none;
          color: white;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          opacity: 0.7;
        ">✕</button>
      </div>
    `;

    // Add event listeners
    banner.querySelector('#pwa-install-btn')?.addEventListener('click', () => {
      this.showInstallPrompt();
    });

    banner.querySelector('#pwa-dismiss-btn')?.addEventListener('click', () => {
      this.hideInstallPrompt();
      this.trackEvent('pwa_install_dismissed');
    });

    return banner;
  }

  private showUpdatePrompt() {
    // Create update notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">Update Available</div>
      <div style="font-size: 14px; margin-bottom: 12px;">A new version is ready to install.</div>
      <button onclick="window.location.reload()" style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
      ">Reload</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  private trackEvent(eventName: string, properties?: Record<string, any>) {
    // Analytics tracking (implement based on your analytics solution)
    console.log('PWA Event:', eventName, properties);
    
    // Example: Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }
  }

  // Public methods
  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public canInstall(): boolean {
    return !!this.deferredPrompt;
  }

  public hasUpdate(): boolean {
    return this.updateAvailable;
  }
}

// Create global PWA manager instance
export const pwaManager = new PWAManager();

// Utility functions for components
export const usePWA = () => {
  return {
    isInstalled: pwaManager.isAppInstalled(),
    canInstall: pwaManager.canInstall(),
    hasUpdate: pwaManager.hasUpdate(),
    install: () => pwaManager.showInstallPrompt(),
  };
};

// Network status utilities
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Import React for hooks (this will be handled by the bundler)
import React from 'react';
