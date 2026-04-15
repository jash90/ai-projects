// Shared framework-level types used across 2+ features

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// UI State Types
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  activeProject: string | null;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
}

// Context Menu Types
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  shortcut?: string;
  dangerous?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

// Activity Types
export interface Activity {
  id: string;
  type: 'message' | 'file_upload' | 'project_create' | 'project_update';
  title: string;
  description: string;
  timestamp: string;
  project?: { id: string; name: string };
  metadata?: Record<string, any>;
}

// Error Types
export interface AppError {
  message: string;
  statusCode?: number;
  details?: string[];
}

// Search Types
export interface SearchResult<T> {
  items: T[];
  query: string;
  results_count: number;
}

// File Upload Types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}
