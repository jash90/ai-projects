import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { FileModel } from '../models/File';
import { ErrorResponse, DeleteResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface File {
  id: string;
  project_id: string;
  name: string;
  content: string;
  type: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateFileRequest {
  name: string;
  content?: string;
  type: string;
}

interface UpdateFileRequest {
  name?: string;
  content?: string;
  type?: string;
}

interface FilesFileStats {
  project_id?: string;
  total_files: number;
  total_size?: number;
  file_types: { type: string; count: number }[];
}

// ===== Success Response Types =====

interface GetProjectFilesResponse {
  success: true;
  data: {
    files: File[];
    count: number;
  };
}

interface GetFileResponse {
  success: true;
  data: {
    file: File;
  };
}

interface CreateFileResponse {
  success: true;
  data: {
    file: File;
  };
}

interface UpdateFileResponse {
  success: true;
  data: {
    file: File;
  };
}

interface DeleteFilesFileResponse extends DeleteResponse {}

interface SearchFilesResponse {
  success: true;
  data: {
    files: File[];
    query: string;
    count: number;
  };
}

interface GetFilesByTypeResponse {
  success: true;
  data: {
    files: File[];
    type: string;
    count: number;
  };
}

interface GetFileStatsResponse {
  success: true;
  data: {
    project_id: string;
  } & FilesFileStats;
}

/**
 * Files Management
 *
 * Endpoints for managing text-based project files for editing.
 */
@Route('files')
@Tags('Files')
export class FilesController extends Controller {
  /**
   * Get all files for a project
   *
   * Retrieves all text-based files associated with a specific project.
   *
   * @summary Get project files
   * @param projectId Project ID
   */
  @Get('projects/{projectId}/files')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch files')
  public async getProjectFiles(
    @Path() projectId: string,
    @Request() request: ExpressRequest
  ): Promise<GetProjectFilesResponse> {
    try {
      const userId = request.user!.id;
      const files = await FileModel.findByProjectId(projectId, userId);

      return {
        success: true,
        data: {
          files,
          count: files.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error fetching project files:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch files');
    }
  }

  /**
   * Create new file in project
   *
   * Creates a new text-based file in the specified project.
   *
   * @summary Create file
   * @param projectId Project ID
   */
  @Post('projects/{projectId}/files')
  @Security('jwt')
  @SuccessResponse('201', 'File created successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(409, 'File with this name already exists')
  @TsoaResponse<ErrorResponse>(500, 'Failed to create file')
  public async createFile(
    @Path() projectId: string,
    @Body() requestBody: CreateFileRequest,
    @Request() request: ExpressRequest
  ): Promise<CreateFileResponse> {
    try {
      const userId = request.user!.id;
      const { name, content, type } = requestBody;

      // Check if file with same name already exists
      const existingFile = await FileModel.findByName(projectId, name, userId);
      if (existingFile) {
        this.setStatus(409);
        throw new Error('File with this name already exists');
      }

      const file = await FileModel.create(projectId, {
        name,
        content: content || '',
        type
      }, userId);

      logger.info('File created', {
        fileId: file.id,
        projectId,
        userId,
        fileName: file.name,
        fileType: file.type,
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      this.setStatus(201);
      return {
        success: true,
        data: {
          file
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error creating file:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get file by ID
   *
   * Retrieves a specific file by its ID.
   *
   * @summary Get file
   * @param id File ID
   */
  @Get('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch file')
  public async getFileById(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<GetFileResponse> {
    try {
      const userId = request.user!.id;
      const file = await FileModel.findById(id, userId);

      if (!file) {
        this.setStatus(404);
        throw new Error('File not found');
      }

      return {
        success: true,
        data: {
          file
        }
      };
    } catch (error) {
      logger.error('Error fetching file:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Update file
   *
   * Updates file content, name, or type.
   *
   * @summary Update file
   * @param id File ID
   */
  @Put('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'File updated successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(409, 'File with this name already exists')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update file')
  public async updateFile(
    @Path() id: string,
    @Body() requestBody: UpdateFileRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateFileResponse> {
    try {
      const userId = request.user!.id;

      // If updating name, check for conflicts
      if (requestBody.name) {
        const existingFile = await FileModel.findById(id, userId);
        if (!existingFile) {
          this.setStatus(404);
          throw new Error('File not found');
        }

        if (requestBody.name !== existingFile.name) {
          const conflictingFile = await FileModel.findByName(
            existingFile.project_id,
            requestBody.name,
            userId
          );
          if (conflictingFile) {
            this.setStatus(409);
            throw new Error('File with this name already exists');
          }
        }
      }

      const file = await FileModel.updateById(id, requestBody, userId);
      if (!file) {
        this.setStatus(404);
        throw new Error('File not found');
      }

      logger.info('File updated', {
        fileId: id,
        userId,
        updates: Object.keys(requestBody),
        correlationId: request.headers['x-correlation-id'] || 'unknown'
      });

      return {
        success: true,
        data: {
          file
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied');
      }

      logger.error('Error updating file:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Delete file
   *
   * Permanently deletes a file.
   *
   * @summary Delete file
   * @param id File ID
   */
  @Delete('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'File deleted successfully')
  @TsoaResponse<ErrorResponse>(404, 'File not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to delete file')
  public async deleteFile(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<DeleteFilesFileResponse> {
    try {
      const userId = request.user!.id;
      const deleted = await FileModel.deleteById(id, userId);

      if (!deleted) {
        this.setStatus(404);
        throw new Error('File not found');
      }

      logger.info('File deleted', { fileId: id, userId, correlationId: request.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting file:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Search files in project
   *
   * Searches for files by name or content in a specific project.
   *
   * @summary Search files
   * @param projectId Project ID
   * @param q Search query
   */
  @Get('projects/{projectId}/files/search')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to search files')
  public async searchFiles(
    @Path() projectId: string,
    @Query() q: string,
    @Request() request: ExpressRequest
  ): Promise<SearchFilesResponse> {
    try {
      const userId = request.user!.id;
      const files = await FileModel.searchFiles(projectId, q, userId);

      return {
        success: true,
        data: {
          files,
          query: q,
          count: files.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error searching files:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to search files');
    }
  }

  /**
   * Get files by type
   *
   * Retrieves all files of a specific type in a project.
   *
   * @summary Get files by type
   * @param projectId Project ID
   * @param type File type
   */
  @Get('projects/{projectId}/files/type/{type}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch files by type')
  public async getFilesByType(
    @Path() projectId: string,
    @Path() type: string,
    @Request() request: ExpressRequest
  ): Promise<GetFilesByTypeResponse> {
    try {
      const userId = request.user!.id;
      const files = await FileModel.getFilesByType(projectId, type, userId);

      return {
        success: true,
        data: {
          files,
          type,
          count: files.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        this.setStatus(403);
        throw new Error('Access denied to this project');
      }

      logger.error('Error fetching files by type:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch files by type');
    }
  }

  /**
   * Get file statistics for project
   *
   * Retrieves statistics about files in a project.
   *
   * @summary Get file statistics
   * @param projectId Project ID
   */
  @Get('projects/{projectId}/files/stats')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(403, 'Access denied')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch file statistics')
  public async getFileStats(
    @Path() projectId: string,
    @Request() request: ExpressRequest
  ): Promise<GetFileStatsResponse> {
    try {
      const userId = request.user!.id;
      const stats = await FileModel.getProjectFileStats(projectId, userId);

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

      logger.error('Error fetching file stats:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Failed to fetch file statistics');
    }
  }
}
