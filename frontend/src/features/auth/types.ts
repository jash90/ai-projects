// Auth domain types

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  token_limit_global?: number;
  token_limit_monthly?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserProfileUpdate {
  username?: string;
  email?: string;
}

export interface UserPasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}
