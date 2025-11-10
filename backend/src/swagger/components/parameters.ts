/**
 * Reusable API Parameters
 * Defines common parameter patterns used across endpoints
 */

export const parameters = {
  // Pagination Parameters
  page: {
    name: 'page',
    in: 'query',
    description: 'Page number for pagination',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
    example: 1,
  },

  limit: {
    name: 'limit',
    in: 'query',
    description: 'Number of items per page',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 10,
    },
    example: 10,
  },

  // ID Parameters
  projectId: {
    name: 'projectId',
    in: 'path',
    description: 'Project unique identifier',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    example: '123e4567-e89b-12d3-a456-426614174000',
  },

  agentId: {
    name: 'agentId',
    in: 'path',
    description: 'Agent unique identifier',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    example: '123e4567-e89b-12d3-a456-426614174001',
  },

  fileId: {
    name: 'id',
    in: 'path',
    description: 'File unique identifier',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    example: '123e4567-e89b-12d3-a456-426614174002',
  },

  userId: {
    name: 'userId',
    in: 'path',
    description: 'User unique identifier',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    example: '123e4567-e89b-12d3-a456-426614174003',
  },

  conversationId: {
    name: 'conversationId',
    in: 'path',
    description: 'Conversation unique identifier',
    required: true,
    schema: {
      type: 'string',
      format: 'uuid',
    },
    example: '123e4567-e89b-12d3-a456-426614174004',
  },

  // Search and Filter Parameters
  search: {
    name: 'search',
    in: 'query',
    description: 'Search query string',
    required: false,
    schema: {
      type: 'string',
    },
    example: 'project name',
  },

  sortBy: {
    name: 'sortBy',
    in: 'query',
    description: 'Field to sort by',
    required: false,
    schema: {
      type: 'string',
      enum: ['created_at', 'updated_at', 'name'],
      default: 'created_at',
    },
    example: 'created_at',
  },

  sortOrder: {
    name: 'sortOrder',
    in: 'query',
    description: 'Sort order',
    required: false,
    schema: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
    },
    example: 'desc',
  },

  mimetype: {
    name: 'mimetype',
    in: 'path',
    description: 'File MIME type filter',
    required: true,
    schema: {
      type: 'string',
    },
    example: 'application/pdf',
  },

  // Date Range Parameters
  startDate: {
    name: 'startDate',
    in: 'query',
    description: 'Start date for filtering (ISO 8601 format)',
    required: false,
    schema: {
      type: 'string',
      format: 'date-time',
    },
    example: '2024-01-01T00:00:00Z',
  },

  endDate: {
    name: 'endDate',
    in: 'query',
    description: 'End date for filtering (ISO 8601 format)',
    required: false,
    schema: {
      type: 'string',
      format: 'date-time',
    },
    example: '2024-12-31T23:59:59Z',
  },
};
