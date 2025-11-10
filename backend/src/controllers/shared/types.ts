/**
 * Shared types for tsoa controllers
 *
 * These types are used across multiple controllers to avoid duplication
 * and ensure consistency in API responses.
 */

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * Base success response
 */
export interface BaseSuccessResponse {
  success: true;
}

/**
 * Standard delete response
 */
export interface DeleteResponse {
  success: true;
  message: string;
}

/**
 * Standard message response
 */
export interface MessageResponse {
  success: true;
  message: string;
}
