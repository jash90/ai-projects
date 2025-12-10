import MarkdownIt from 'markdown-it'
import markdownItKatex from 'markdown-it-katex'
import markdownItToc from 'markdown-it-table-of-contents'
import markdownItFootnote from 'markdown-it-footnote'
import puppeteer from 'puppeteer'
import logger from '../utils/logger'

class MarkdownService {
  private md: MarkdownIt

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    })
    .use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' })
    .use(markdownItToc, {
      includeLevel: [1, 2, 3, 4],
      containerClass: 'table-of-contents',
      markerPattern: /^\[\[toc\]\]/im
    })
    .use(markdownItFootnote)
  }

  /**
   * Render Markdown to HTML
   */
  renderToHtml(markdown: string): string {
    try {
      return this.md.render(markdown)
    } catch (error) {
      logger.error('Markdown rendering error:', error)
      throw new Error('Failed to render Markdown')
    }
  }

  /**
   * Export Markdown to PDF
   */
  async exportToPdf(markdown: string, filename: string): Promise<Uint8Array> {
    try {
      const html = this.renderToHtml(markdown)
      const fullHtml = this.wrapHtmlForPdf(html)
      
      // Railway 512MB optimization: minimize Chromium memory usage
      const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',      // Critical: use /tmp instead of /dev/shm (Docker memory)
          '--disable-gpu',                 // No GPU acceleration needed
          '--disable-extensions',          // No extensions
          '--single-process',              // Reduces memory footprint
          '--no-zygote',                   // Disable zygote process
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-first-run',
          '--js-flags=--max-old-space-size=128'  // Limit Chromium JS heap to 128MB
        ]
      })
      
      const page = await browser.newPage()
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      })
      
      await browser.close()
      return pdf
    } catch (error) {
      logger.error('PDF export error:', error)
      throw new Error('Failed to export PDF')
    }
  }

  /**
   * Wrap HTML with CSS for PDF export
   */
  private wrapHtmlForPdf(html: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Document</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #2c3e50;
              margin-top: 2em;
              margin-bottom: 1em;
            }
            code {
              background: #f4f4f4;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Monaco', 'Menlo', monospace;
            }
            pre {
              background: #f4f4f4;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .table-of-contents {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin: 1em 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `
  }
}

export const markdownService = new MarkdownService()
