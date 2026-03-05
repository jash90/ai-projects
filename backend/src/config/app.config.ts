import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  uploadPath: process.env.UPLOAD_PATH || '/tmp/uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  allowedFileTypes: (
    process.env.ALLOWED_FILE_TYPES ||
    '.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.sass,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash,.dockerfile,.gitignore,.env.example'
  ).split(','),
  logLevel: process.env.LOG_LEVEL || 'info',
}));
