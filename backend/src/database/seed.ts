import { pool } from './connection';
import logger from '../utils/logger';

export async function seedDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create default agents
    const defaultAgents = [
      {
        name: 'General Assistant',
        description: 'A versatile AI assistant that can help with a wide range of tasks including writing, analysis, problem-solving, and general conversation.',
        system_prompt: `You are a helpful, knowledgeable, and versatile AI assistant. You can assist with a wide range of tasks including:

- Writing and editing (emails, documents, creative writing)
- Analysis and research
- Problem-solving and brainstorming
- Code review and programming help
- General conversation and Q&A

Always be helpful, accurate, and clear in your responses. If you're unsure about something, say so. Provide detailed explanations when helpful, but be concise when brevity is preferred.`,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        name: 'Code Expert',
        description: 'A specialized AI assistant focused on programming, software development, debugging, and technical problem-solving.',
        system_prompt: `You are a senior software engineer and programming expert. You specialize in:

- Code review and optimization
- Debugging and troubleshooting
- Architecture and design patterns
- Multiple programming languages and frameworks
- Best practices and coding standards
- Technical problem-solving

Always provide clear, well-commented code examples. Explain your reasoning and suggest best practices. Consider performance, maintainability, and security in your recommendations. If you spot potential issues, point them out and suggest improvements.`,
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 3000
      },
      {
        name: 'Creative Writer',
        description: 'An AI assistant specialized in creative writing, storytelling, content creation, and literary analysis.',
        system_prompt: `You are a creative writing expert and literary professional. You excel at:

- Creative writing (fiction, poetry, scripts)
- Content creation and copywriting
- Story development and plot structure
- Character development
- Literary analysis and critique
- Writing style and technique guidance

Be imaginative, engaging, and supportive of creative expression. Provide constructive feedback and suggestions. Help develop ideas while maintaining the user's unique voice and vision. Offer specific techniques and examples to improve writing craft.`,
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.8,
        max_tokens: 2500
      }
    ];

    // Insert default agents
    for (const agent of defaultAgents) {
      const existingAgent = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agent.name]
      );

      if (existingAgent.rows.length === 0) {
        await client.query(`
          INSERT INTO agents (name, description, system_prompt, provider, model, temperature, max_tokens)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          agent.name,
          agent.description,
          agent.system_prompt,
          agent.provider,
          agent.model,
          agent.temperature,
          agent.max_tokens
        ]);

        logger.info(`Created default agent: ${agent.name}`);
      } else {
        logger.info(`Default agent already exists: ${agent.name}`);
      }
    }

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}