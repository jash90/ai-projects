// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  file_count?: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// Form Types
export interface ProjectFormData {
  name: string;
  description: string;
}
