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
import type { Project } from '../types';
import { ProjectModel } from '../models/Project';
import { ErrorResponse, DeleteResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface CreateProjectRequest {
  name: string;
  description?: string;
}

interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

// ===== Success Response Types =====

interface GetProjectsResponse {
  success: true;
  data: {
    items: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface GetProjectResponse {
  success: true;
  data: {
    project: Project;
  };
}

interface CreateProjectResponse {
  success: true;
  data: {
    project: Project;
  };
}

interface UpdateProjectResponse {
  success: true;
  data: {
    project: Project;
  };
}

interface DeleteProjectResponse extends DeleteResponse {}

interface GetRecentProjectsResponse {
  success: true;
  data: {
    projects: Project[];
  };
}

interface SearchProjectsResponse {
  success: true;
  data: {
    projects: Project[];
    query: string;
  };
}

/**
 * Projects Management
 *
 * Endpoints for creating, reading, updating, and deleting user projects.
 */
@Route('projects')
@Tags('Projects')
export class ProjectsController extends Controller {
  /**
   * Get all projects for the current user
   *
   * Retrieves a paginated list of projects owned by the authenticated user.
   *
   * @summary Get all projects
   */
  @Get()
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch projects')
  public async getProjects(
    @Query() page: number = 1,
    @Query() limit: number = 10,
    @Query() search?: string,
    @Request() request?: ExpressRequest
  ): Promise<GetProjectsResponse> {
    try {
      // Validate request and user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to getProjects');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const result = await ProjectModel.findByUserId(userId, page, limit, search);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching projects:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get recent projects
   *
   * Retrieves the most recently accessed projects for the authenticated user.
   *
   * @summary Get recent projects
   */
  @Get('recent')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch recent projects')
  public async getRecentProjects(
    @Query() limit: number = 5,
    @Request() request?: ExpressRequest
  ): Promise<GetRecentProjectsResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to getRecentProjects');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const projects = await ProjectModel.getRecentActivity(userId, limit);

      return {
        success: true,
        data: {
          projects
        }
      };
    } catch (error) {
      logger.error('Error fetching recent projects:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Search projects
   *
   * Searches projects by name or description for the authenticated user.
   *
   * @summary Search projects
   */
  @Get('search')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(500, 'Failed to search projects')
  public async searchProjects(
    @Query() q: string,
    @Query() limit: number = 10,
    @Request() request?: ExpressRequest
  ): Promise<SearchProjectsResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to searchProjects');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const projects = await ProjectModel.searchProjects(userId, q, limit);

      return {
        success: true,
        data: {
          projects,
          query: q
        }
      };
    } catch (error) {
      logger.error('Error searching projects:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get project by ID
   *
   * Retrieves a specific project by its ID.
   *
   * @summary Get project by ID
   * @param id Project ID
   */
  @Get('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(404, 'Project not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch project')
  public async getProjectById(
    @Path() id: string,
    @Request() request?: ExpressRequest
  ): Promise<GetProjectResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to getProjectById');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const project = await ProjectModel.findById(id, userId);

      if (!project) {
        this.setStatus(404);
        throw new Error('Project not found');
      }

      return {
        success: true,
        data: {
          project
        }
      };
    } catch (error) {
      logger.error('Error fetching project:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Create new project
   *
   * Creates a new project for the authenticated user.
   *
   * @summary Create new project
   */
  @Post()
  @Security('jwt')
  @SuccessResponse('201', 'Project created successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(500, 'Failed to create project')
  public async createProject(
    @Body() requestBody: CreateProjectRequest,
    @Request() request?: ExpressRequest
  ): Promise<CreateProjectResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to createProject');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const projectData = {
        ...requestBody,
        user_id: userId
      };

      const project = await ProjectModel.create(projectData);

      logger.info('Project created', {
        projectId: project.id,
        userId,
        correlationId: request?.headers['x-correlation-id'] || 'unknown'
      });

      this.setStatus(201);
      return {
        success: true,
        data: {
          project
        }
      };
    } catch (error) {
      logger.error('Error creating project:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Update project
   *
   * Updates an existing project's information.
   *
   * @summary Update project
   * @param id Project ID
   */
  @Put('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Project updated successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(404, 'Project not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update project')
  public async updateProject(
    @Path() id: string,
    @Body() requestBody: UpdateProjectRequest,
    @Request() request?: ExpressRequest
  ): Promise<UpdateProjectResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to updateProject');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const project = await ProjectModel.updateById(id, userId, requestBody);

      if (!project) {
        this.setStatus(404);
        throw new Error('Project not found');
      }

      logger.info('Project updated', { projectId: id, userId, updates: Object.keys(requestBody), correlationId: request?.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        data: {
          project
        }
      };
    } catch (error) {
      logger.error('Error updating project:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Delete project
   *
   * Permanently deletes a project and all associated data.
   *
   * @summary Delete project
   * @param id Project ID
   */
  @Delete('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Project deleted successfully')
  @TsoaResponse<ErrorResponse>(401, 'Unauthorized')
  @TsoaResponse<ErrorResponse>(404, 'Project not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to delete project')
  public async deleteProject(
    @Path() id: string,
    @Request() request?: ExpressRequest
  ): Promise<DeleteProjectResponse> {
    try {
      // Validate user authentication
      if (!request || !request.user || !request.user.id) {
        logger.warn('Unauthorized access attempt to deleteProject');
        this.setStatus(401);
        throw new Error('Unauthorized: User not authenticated');
      }

      const userId = request.user.id;
      const deleted = await ProjectModel.deleteById(id, userId);

      if (!deleted) {
        this.setStatus(404);
        throw new Error('Project not found');
      }

      logger.info('Project deleted', { projectId: id, userId, correlationId: request?.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        message: 'Project deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting project:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
