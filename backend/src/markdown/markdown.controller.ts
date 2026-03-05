import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarkdownService } from './markdown.service';

@ApiTags('Markdown')
@ApiBearerAuth()
@Controller('markdown')
export class MarkdownController {
  constructor(private readonly markdownService: MarkdownService) {}

  @Post('render')
  @ApiOperation({ summary: 'Render Markdown to HTML' })
  render(@Body() body: { content: string }) {
    const html = this.markdownService.renderToHtml(body.content);
    return { html };
  }
}
