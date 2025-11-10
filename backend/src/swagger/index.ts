/**
 * Swagger Configuration
 * Main configuration file for API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { swaggerDefinition } from './definition';
import { schemas } from './components/schemas';
import { responses } from './components/responses';
import { parameters } from './components/parameters';
import { securitySchemes } from './components/securitySchemes';
import path from 'path';

/**
 * Swagger JSDoc configuration options
 */
const options: swaggerJsdoc.Options = {
  definition: {
    ...swaggerDefinition,
    components: {
      schemas,
      responses,
      parameters,
      securitySchemes,
    },
  },
  // Paths to files containing OpenAPI definitions
  // Scan only compiled .js files (with preserved JSDoc comments)
  apis: [path.join(__dirname, '../routes/*.js')],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(options);

/**
 * Swagger UI options
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Projects Platform API Documentation',
  swaggerOptions: {
    persistAuthorization: true, // Keep auth token after page refresh
    displayRequestDuration: true, // Show request duration
    filter: true, // Enable search/filter
    tryItOutEnabled: true, // Enable "Try it out" by default
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
  },
};

/**
 * Setup Swagger documentation for Express app
 * @param app Express application instance
 */
export function setupSwagger(app: Express): void {
  // Enable in development by default, require explicit enable in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isEnabled = isDevelopment
    ? process.env.ENABLE_SWAGGER !== 'false'
    : process.env.ENABLE_SWAGGER === 'true';

  if (!isEnabled) {
    console.log('📚 Swagger documentation is disabled');
    return;
  }

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
  console.log('📄 OpenAPI spec available at /api-docs.json');
}

export default setupSwagger;
