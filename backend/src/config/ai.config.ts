import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
}));
