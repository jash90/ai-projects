import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { AgentModel } from '../models/Agent';
import { ErrorResponse, DeleteResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface Agent {
  id: string;
  name: string;
  description?: string | null;
  prompt?: string;
  system_prompt?: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  temperature: number;
  max_tokens: number | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateAgentRequest {
  name: string;
  description?: string;
  prompt?: string;
  system_prompt: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  temperature?: number;
  max_tokens?: number;
}

interface UpdateAgentRequest {
  name?: string;
  description?: string;
  prompt?: string;
  system_prompt?: string;
  model?: string;
  provider?: 'openai' | 'anthropic' | 'openrouter';
  temperature?: number;
  max_tokens?: number;
}

// ===== Success Response Types =====

interface GetAgentsResponse {
  success: true;
  data: {
    agents: Agent[];
  };
}

interface GetAgentResponse {
  success: true;
  data: {
    agent: Agent;
  };
}

interface CreateAgentResponse {
  success: true;
  data: {
    agent: Agent;
  };
}

interface UpdateAgentResponse {
  success: true;
  data: {
    agent: Agent;
  };
}

interface DeleteAgentResponse extends DeleteResponse {}

interface GetAgentStatsResponse {
  success: true;
  data: {
    agent_id: string;
    conversations_using: number;
    can_delete: boolean;
  };
}

/**
 * AI Agents Management
 *
 * Endpoints for creating, reading, updating, and deleting AI agents.
 */
@Route('agents')
@Tags('Agents')
export class AgentsController extends Controller {
  /**
   * Get all agents
   *
   * Retrieves a list of all available AI agents.
   *
   * @summary Get all agents
   */
  @Get()
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch agents')
  public async getAgents(
    @Request() request: ExpressRequest
  ): Promise<GetAgentsResponse> {
    try {
      const agents = await AgentModel.findAll();

      return {
        success: true,
        data: {
          agents
        }
      };
    } catch (error) {
      logger.error('Error fetching agents:', error);
      this.setStatus(500);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Get agent by ID
   *
   * Retrieves a specific agent by its ID.
   *
   * @summary Get agent by ID
   * @param id Agent ID
   */
  @Get('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch agent')
  public async getAgentById(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<GetAgentResponse> {
    try {
      const agent = await AgentModel.findById(id);

      if (!agent) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      return {
        success: true,
        data: {
          agent
        }
      };
    } catch (error) {
      logger.error('Error fetching agent:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Create new agent
   *
   * Creates a new AI agent with specified configuration.
   *
   * @summary Create new agent
   */
  @Post()
  @Security('jwt')
  @SuccessResponse('201', 'Agent created successfully')
  @TsoaResponse<ErrorResponse>(500, 'Failed to create agent')
  public async createAgent(
    @Body() requestBody: CreateAgentRequest,
    @Request() request: ExpressRequest
  ): Promise<CreateAgentResponse> {
    try {
      const agent = await AgentModel.create(requestBody);

      logger.info('Agent created', { agentId: agent.id, name: agent.name, createdBy: request.user!.id });

      this.setStatus(201);
      return {
        success: true,
        data: {
          agent
        }
      };
    } catch (error) {
      logger.error('Error creating agent:', error);
      this.setStatus(500);
      throw new Error('Failed to create agent');
    }
  }

  /**
   * Update agent
   *
   * Updates an existing agent's configuration.
   *
   * @summary Update agent
   * @param id Agent ID
   */
  @Put('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Agent updated successfully')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to update agent')
  public async updateAgent(
    @Path() id: string,
    @Body() requestBody: UpdateAgentRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateAgentResponse> {
    try {
      const agent = await AgentModel.updateById(id, requestBody);

      if (!agent) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      logger.info('Agent updated', { agentId: id, updates: Object.keys(requestBody), updatedBy: request.user!.id });

      return {
        success: true,
        data: {
          agent
        }
      };
    } catch (error) {
      logger.error('Error updating agent:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Delete agent
   *
   * Permanently deletes an agent. Cannot delete agents in use by conversations.
   *
   * @summary Delete agent
   * @param id Agent ID
   */
  @Delete('{id}')
  @Security('jwt')
  @SuccessResponse('200', 'Agent deleted successfully')
  @TsoaResponse<ErrorResponse>(400, 'Cannot delete agent in use')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to delete agent')
  public async deleteAgent(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<DeleteAgentResponse> {
    try {
      const deleted = await AgentModel.deleteById(id);

      if (!deleted) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      logger.info('Agent deleted', { agentId: id, deletedBy: request.user!.id });

      return {
        success: true,
        message: 'Agent deleted successfully'
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('being used in conversations')) {
        this.setStatus(400);
        throw new Error('Cannot delete agent that is being used in conversations');
      }

      logger.error('Error deleting agent:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Get agent usage statistics
   *
   * Retrieves statistics about how many conversations are using this agent.
   *
   * @summary Get agent usage statistics
   * @param id Agent ID
   */
  @Get('{id}/stats')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'Agent not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to fetch agent statistics')
  public async getAgentStats(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<GetAgentStatsResponse> {
    try {
      const agent = await AgentModel.findById(id);
      if (!agent) {
        this.setStatus(404);
        throw new Error('Agent not found');
      }

      const usageCount = await AgentModel.getUsageCount(id);

      return {
        success: true,
        data: {
          agent_id: id,
          conversations_using: usageCount,
          can_delete: usageCount === 0
        }
      };
    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
