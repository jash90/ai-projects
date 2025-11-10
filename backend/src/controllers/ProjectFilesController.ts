import {
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Query,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request,
  UploadedFile
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { ProjectFileModel } from '../models/ProjectFile';
import { PaginationInfo, ErrorResponse, DeleteResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

interface ProjectFileStats {
  total_files: number;
  total_size: number;
  file_types: { mimetype: string; count: number; total_size: number }[];
}

// ===== Success Response Types =====

interface GetProjectUploadsResponse {
  success: true;
  data: {
    items: ProjectFile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UploadFileResponse {
  success: true;
  data: {
    file: Omit<ProjectFile, 'path'>;
  };
}

interface DeleteProjectFileResponse extends DeleteResponse {}

interface GetFilesByMimetypeResponse {
  success: true;
  data: {
    files: ProjectFile[];
    mimetype: string;
    count: number;
  };
}

interface SearchProjectFilesResponse {
  success: true;
  data: {
    files: ProjectFile[];
    query: string;
    results_count: number;
  };
}

interface GetProjectFileStatsResponse {
  success: true;
  data: {
    project_id: string;
  } & ProjectFileStats;
}

/**
 * Project Files Management
 *
 * Endpoints for managing uploaded binary files (images, documents, etc.) for AI agent context.
 * Note: File upload endpoints use multipart/form-data and are handled by Express routes.
 */
@Route('project-files')
@Tags('Project Files')
export class ProjectFilesController extends Controller {
  /**
   * Get uploaded files for a project
   *
   * Retrieves a paginated list of uploaded files for a specific project.
   *
   * @summary Get project uploads
   * @param projectId Project ID
   */
  @Get('projects/{projectId}/uploads')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch files')
  public async getProjectUploads(
    @Path() projectId: string,
    @Query() page: number = 1,
    @Query() limit: number = 20,
    @Request() request?: ExpressRequest
  ): Promise<GetProjectUploadsResponse> {
    try {
      const userId = request!.user!.id;
      const result = await ProjectFileModel.findByProjectId(projectId, userId, page, limit);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error fetching files:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch files');
    }
  }

  /**
   * Upload file to project
   *
   * NOTE: This endpoint uses multipart/form-data and is handled by Express routes.
   * Use POST /api/files/projects/:projectId/uploads with form field 'file'.
   * Maximum file size: 10MB. Allowed types: text, images, PDFs, etc.
   *
   * @summary Upload file to project
   * @param projectId Project ID
   */
  @Post('projects/{projectId}/uploads')
  @Security('jwt')
  @SuccessResponse('201', 'File uploaded successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(404, 'Project not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to upload file')
  public async uploadFile(
    @Path() projectId: string,
    @Request() request?: ExpressRequest
  ): Promise<UploadFileResponse> {
    // Note: The actual implementation is in routes/projectFiles.ts with multer
    // This controller method is for documentation purposes only
    throw new Error('This endpoint should be handled by Express routes/projectFiles.ts with multer');
  }

  /**
   * Get file by ID (for download/view)
   *
   * Retrieves and serves a specific file by its ID.
   *
   * @summary Get file
   * @param id File ID
   */
  @Get('files/{id}')
  @Security('jwt')
  @SuccessResponse('200', 'File retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to serve file')
  public async getFileById(
    @Path() id: string,
    @Request() request?: ExpressRequest
  ): Promise<void> {
    // Note: This endpoint streams file content directly
    // The actual implementation is in routes/projectFiles.ts
    throw new Error('This endpoint should be handled by Express routes/projectFiles.ts');
  }

  /**
   * Download file (with Content-Disposition: attachment)
   *
   * Downloads a specific file by its ID.
   *
   * @summary Download file
   * @param id File ID
   */
  @Get('files/{id}/download')
  @Security('jwt')
  @SuccessResponse('200', 'File downloaded successfully')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to download file')
  public async downloadFile(
    @Path() id: string,
    @Request() request?: ExpressRequest
  ): Promise<void> {
    // Note: This endpoint streams file content directly
    // The actual implementation is in routes/projectFiles.ts
    throw new Error('This endpoint should be handled by Express routes/projectFiles.ts');
  }

  /**
   * Delete file
   *
   * Permanently deletes an uploaded file from both database and filesystem.
   *
   * @summary Delete file
   * @param id File ID
   */
  @Delete('files/{id}')
  @Security('jwt')
  @SuccessResponse('200', 'File deleted successfully')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to delete file')
  public async deleteFile(
    @Path() id: string,
    @Request() request?: ExpressRequest
  ): Promise<DeleteProjectFileResponse> {
    try {
      const userId = request!.user!.id;

      // Get file path before deletion
      const filePath = await ProjectFileModel.getFilePath(id, userId);
      if (!filePath) {
        this.setStatus(404);
        throw new Error('File not found');
      }

      // Delete from database (filesystem cleanup handled in Express route)
      const deleted = await ProjectFileModel.deleteById(id, userId);
      if (!deleted) {
        this.setStatus(404);
        throw new Error('File not found');
      }

      logger.info('File deleted', { fileId: id, userId, correlationId: request?.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting file:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get files by type for a project
   *
   * Retrieves all files of a specific MIME type for a project.
   *
   * @summary Get files by MIME type
   * @param projectId Project ID
   * @param mimetype MIME type (e.g., 'image/png', 'text/plain')
   */
  @Get('projects/{projectId}/uploads/type/{mimetype}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch files by type')
  public async getFilesByMimetype(
    @Path() projectId: string,
    @Path() mimetype: string,
    @Request() request?: ExpressRequest
  ): Promise<GetFilesByMimetypeResponse> {
    try {
      const userId = request!.user!.id;
      const files = await ProjectFileModel.getFilesByMimetype(projectId, userId, mimetype);

      return {
        success: true,
        data: {
          files,
          mimetype,
          count: files.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error fetching files by type:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch files by type');
    }
  }

  /**
   * Search files in a project
   *
   * Searches for files by name in a specific project.
   *
   * @summary Search project files
   * @param projectId Project ID
   * @param q Search query
   */
  @Get('projects/{projectId}/uploads/search')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to search files')
  public async searchProjectFiles(
    @Path() projectId: string,
    @Query() q: string,
    @Query() limit: number = 20,
    @Request() request?: ExpressRequest
  ): Promise<SearchProjectFilesResponse> {
    try {
      const userId = request!.user!.id;
      const files = await ProjectFileModel.searchFiles(projectId, userId, q, limit);

      return {
        success: true,
        data: {
          files,
          query: q,
          results_count: files.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error searching files:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to search files');
    }
  }

  /**
   * Get file statistics for a project
   *
   * Retrieves statistics about uploaded files in a project.
   *
   * @summary Get project file statistics
   * @param projectId Project ID
   */
  @Get('projects/{projectId}/uploads/stats')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch file statistics')
  public async getProjectFileStats(
    @Path() projectId: string,
    @Request() request?: ExpressRequest
  ): Promise<GetProjectFileStatsResponse> {
    try {
      const userId = request!.user!.id;
      const stats = await ProjectFileModel.getProjectStats(projectId, userId);

      return {
        success: true,
        data: {
          project_id: projectId,
          ...stats
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error fetching file stats:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch file statistics');
    }
  }
}
