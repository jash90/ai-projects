import MarkdownIt from 'markdown-it'
import markdownItKatex from 'markdown-it-katex'
import markdownItTocDoneRight from 'markdown-it-toc-done-right'
import markdownItFootnote from 'markdown-it-footnote'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItEmoji from 'markdown-it-emoji'
import markdownItAnchor from 'markdown-it-anchor'
import markdownItHighlightJs from 'markdown-it-highlightjs'
import hljs from 'highlight.js'
import puppeteer from 'puppeteer'
import logger from '../utils/logger'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

class MarkdownService {
  private md: MarkdownIt
  private mdWithMermaid: MarkdownIt

  constructor() {
    // Configure highlight.js
    hljs.configure({
      classPrefix: 'hljs-',
      languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'sql', 'bash', 'json', 'yaml', 'html', 'css', 'markdown']
    })

    // Base markdown-it instance with all plugins
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    })
    .use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' })
    .use(markdownItTocDoneRight, {
      containerClass: 'table-of-contents',
      containerId: 'toc',
      listType: 'ul',
      listClass: 'toc-list',
      itemClass: 'toc-item',
      linkClass: 'toc-link',
      level: [1, 2, 3, 4]
    })
    .use(markdownItFootnote)
    .use(markdownItTaskLists, { enabled: true, label: true })
    .use(markdownItEmoji)
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: 'before',
        symbol: '#'
      }),
      level: [1, 2, 3, 4],
      slugify: (s: string) => s.toLowerCase().replace(/[^\w]+/g, '-')
    })
    .use(markdownItHighlightJs, {
      auto: true,
      code: true,
      inline: true,
      hljs
    })

    // Instance with mermaid support for diagrams
    this.mdWithMermaid = this.setupMermaidRenderer()
  }

  /**
   * Setup Mermaid renderer for diagrams
   */
  private setupMermaidRenderer(): MarkdownIt {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    })

    // Copy all plugins from base instance
    md.use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' })
    .use(markdownItTocDoneRight, {
      containerClass: 'table-of-contents',
      containerId: 'toc',
      listType: 'ul',
      listClass: 'toc-list',
      itemClass: 'toc-item',
      linkClass: 'toc-link',
      level: [1, 2, 3, 4]
    })
    .use(markdownItFootnote)
    .use(markdownItTaskLists, { enabled: true, label: true })
    .use(markdownItEmoji)
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: 'before',
        symbol: '#'
      }),
      level: [1, 2, 3, 4],
      slugify: (s: string) => s.toLowerCase().replace(/[^\w]+/g, '-')
    })
    .use(markdownItHighlightJs, {
      auto: true,
      code: true,
      inline: true,
      hljs
    })

    // Add custom mermaid renderer
    const defaultFence = md.renderer.rules.fence
    md.renderer.rules.fence = function (tokens, idx, options, env, renderer) {
      const token = tokens[idx]
      const info = token.info ? token.info.trim() : ''

      if (info === 'mermaid') {
        return `<div class="mermaid">${token.content}</div>`
      }

      if (defaultFence) {
        return defaultFence(tokens, idx, options, env, renderer)
      }
      return ''
    }

    return md
  }

  /**
   * Render Markdown to HTML with optional mermaid support
   */
  renderToHtml(markdown: string, options?: { mermaid?: boolean }): string {
    try {
      const renderer = options?.mermaid ? this.mdWithMermaid : this.md
      return renderer.render(markdown)
    } catch (error) {
      logger.error('Markdown rendering error:', error)
      throw new Error('Failed to render Markdown')
    }
  }

  /**
   * Validate markdown syntax
   */
  validateMarkdown(markdown: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      // Try to render to catch syntax errors
      this.md.render(markdown)

      // Check for common issues
      const lines = markdown.split('\n')
      lines.forEach((line, index) => {
        // Check for unclosed code blocks
        if (line.startsWith('```') && !line.includes('```', 3)) {
          const nextFence = lines.slice(index + 1).findIndex(l => l.startsWith('```'))
          if (nextFence === -1) {
            errors.push(`Unclosed code block at line ${index + 1}`)
          }
        }

        // Check for malformed links
        const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g
        let match
        while ((match = linkRegex.exec(line)) !== null) {
          if (!match[2]) {
            errors.push(`Empty link URL at line ${index + 1}`)
          }
        }
      })

      return { valid: errors.length === 0, errors }
    } catch (error: any) {
      return { valid: false, errors: [error.message || 'Invalid markdown syntax'] }
    }
  }

  /**
   * Extract metadata from markdown
   */
  extractMetadata(markdown: string): {
    title?: string
    headings: { level: number; text: string; slug: string }[]
    wordCount: number
    readingTime: number
  } {
    const headings: { level: number; text: string; slug: string }[] = []
    let title: string | undefined

    // Extract headings
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    let match
    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const slug = text.toLowerCase().replace(/[^\w]+/g, '-')

      if (level === 1 && !title) {
        title = text
      }

      headings.push({ level, text, slug })
    }

    // Calculate word count and reading time
    const words = markdown.replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/[#*`~\[\]()!]/g, '') // Remove markdown syntax
      .split(/\s+/)
      .filter(word => word.length > 0)

    const wordCount = words.length
    const readingTime = Math.ceil(wordCount / 200) // Average reading speed

    return { title, headings, wordCount, readingTime }
  }

  /**
   * Validate mermaid code for safety
   */
  private validateMermaidCode(code: string): boolean {
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /[;&|`$(){}[\]<>]/g, // Shell metacharacters
      /\.\.\//g, // Path traversal
      /['"]/g, // Quotes that could break out of commands
    ]

    // Limit code size to prevent DoS
    if (code.length > 10000) {
      throw new Error('Mermaid diagram too large')
    }

    // Check for dangerous patterns in the code
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        // Allow safe mermaid syntax elements
        const safeMermaidSyntax = /^[\w\s\-:>|{}\[\]().,!#%\n\r]+$/
        if (!safeMermaidSyntax.test(code)) {
          throw new Error('Invalid characters in Mermaid diagram')
        }
      }
    }

    return true
  }

  /**
   * Render mermaid diagrams to SVG (secured version)
   */
  async renderMermaidToSvg(mermaidCode: string): Promise<string> {
    try {
      // Validate input to prevent injection attacks
      this.validateMermaidCode(mermaidCode)

      // Use crypto for secure random directory names
      const randomId = crypto.randomBytes(16).toString('hex')
      const tempDir = path.join(os.tmpdir(), `mermaid-${randomId}`)
      await fs.mkdir(tempDir, { recursive: true })

      // Sanitize file paths
      const inputFile = path.join(tempDir, 'input.mmd')
      const outputFile = path.join(tempDir, 'output.svg')

      // Validate paths don't escape temp directory
      if (!inputFile.startsWith(tempDir) || !outputFile.startsWith(tempDir)) {
        throw new Error('Invalid file path')
      }

      await fs.writeFile(inputFile, mermaidCode)

      await new Promise((resolve, reject) => {
        const child = spawn('npx', [
          'mmdc',
          '-i', inputFile,
          '-o', outputFile,
          '-t', 'dark',
          '-b', 'transparent'
        ], {
          timeout: 30000,
          shell: false // Disable shell to prevent injection
        })

        let stderr = ''
        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        child.on('error', reject)
        child.on('exit', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Mermaid CLI exited with code ${code}: ${stderr}`))
          } else {
            if (stderr && !stderr.includes('successfully')) {
              logger.warn('Mermaid rendering warning:', stderr)
            }
            resolve(undefined)
          }
        })
      })

      const svg = await fs.readFile(outputFile, 'utf-8')

      // Cleanup temp files with error handling
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        logger.error('Failed to cleanup temp directory:', cleanupError)
      }

      return svg
    } catch (error) {
      logger.error('Mermaid rendering error:', error)
      throw new Error('Failed to render Mermaid diagram')
    }
  }

  /**
   * Export Markdown to PDF
   */
  async exportToPdf(markdown: string, filename: string): Promise<Uint8Array> {
    try {
      const html = this.renderToHtml(markdown)
      const fullHtml = this.wrapHtmlForPdf(html)
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
