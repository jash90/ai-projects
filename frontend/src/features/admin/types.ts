export interface AdminStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_messages: number;
  total_tokens_used: number;
  total_cost: number;
  monthly_tokens: number;
  monthly_cost: number;
  top_users: UserUsageStats[];
}

export interface UserUsageStats {
  user_id: string;
  email: string;
  username: string;
  token_limit_global?: number;
  token_limit_monthly?: number;
  total_tokens: number;
  monthly_tokens: number;
  total_cost: number;
  monthly_cost: number;
  project_count: number;
  last_active: string;
}

export interface UserManagement {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  token_limit_global?: number;
  token_limit_monthly?: number;
  is_active: boolean;
  total_tokens_used: number;
  monthly_tokens_used: number;
  project_count: number;
  last_active?: string;
  created_at: string;
}

export interface TokenLimitUpdate {
  user_id?: string;
  global_limit?: number;
  monthly_limit?: number;
}

export interface AdminActivity {
  id: string;
  admin_user_id: string;
  admin_email: string;
  admin_username: string;
  action_type: string;
  target_user_id?: string;
  target_email?: string;
  target_username?: string;
  details: any;
  created_at: string;
}
