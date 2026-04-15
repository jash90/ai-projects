// File Types

// Named TextFile to avoid collision with browser's native File type
export interface TextFile {
  id: string;
  project_id: string;
  name: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  // Additional properties for uploaded files
  isUploaded?: boolean;
  size?: number;
  mimetype?: string;
}

export interface FileCreate {
  name: string;
  content: string;
  type: string;
}

export interface FileUpdate {
  name?: string;
  content?: string;
  type?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}
