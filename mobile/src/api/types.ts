// Typed mutation bodies extracted from OpenAPI component schemas
// These avoid the deep path navigation into optional requestBody.content

import type { paths, components } from './generated/schema';

// ─── Input types (from component schemas) ────────────────────────────

export type LoginInput = components['schemas']['LoginInput'];
export type RegisterInput = components['schemas']['RegisterInput'];
export type RefreshTokenInput = components['schemas']['RefreshTokenInput'];

export type CreateProjectInput = components['schemas']['CreateProjectInput'];
export type UpdateProjectInput = components['schemas']['UpdateProjectInput'];

export type CreateAgentInput = components['schemas']['CreateAgentInput'];
export type UpdateAgentInput = components['schemas']['UpdateAgentInput'];

export type CreateFileInput = components['schemas']['CreateFileInput'];
export type UpdateFileInput = components['schemas']['UpdateFileInput'];

// ─── Domain types (from component schemas) ───────────────────────────

export type User = components['schemas']['User'];
export type Project = components['schemas']['Project'];
export type Agent = components['schemas']['Agent'];
export type Conversation = components['schemas']['Conversation'];
export type ConversationMessage = components['schemas']['ConversationMessage'];
export type MessageMetadata = components['schemas']['MessageMetadata'];
export type Thread = components['schemas']['Thread'];
export type ThreadMessage = components['schemas']['ThreadMessage'];
export type ProjectFile = components['schemas']['ProjectFile'];
export type UploadedFile = components['schemas']['UploadedFile'];
export type AIModel = components['schemas']['AIModel'];
export type ProviderStatus = components['schemas']['ProviderStatus'];
export type UsageStats = components['schemas']['UsageStats'];
