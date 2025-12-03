// Chat file attachment constants - shared between frontend and backend
// Single source of truth to prevent drift between packages

export const SUPPORTED_CHAT_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export type SupportedChatFileType = typeof SUPPORTED_CHAT_FILE_TYPES[number];

export const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024; // 20MB max per file
export const MAX_CHAT_FILES_COUNT = 5; // Max 5 files per message
