import { Injectable } from '@nestjs/common';
import { markdownService } from '../services/markdownService';

@Injectable()
export class MarkdownService {
  renderToHtml(content: string): string {
    return markdownService.renderToHtml(content);
  }
}
