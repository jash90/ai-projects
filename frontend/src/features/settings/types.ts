import type { Theme } from '@/shared/types';

export interface UserSettings {
  theme: Theme;
  notifications: {
    email: boolean;
    desktop: boolean;
    sounds: boolean;
  };
  chat: {
    sendOnEnter: boolean;
    showTimestamps: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
}
