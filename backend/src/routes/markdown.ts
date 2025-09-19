import { Router, Request, Response } from 'express'
import { markdownService } from '../services/markdownService'
import { authenticateToken } from '../middleware/auth'
import Joi from 'joi'

const router: Router = Router()

// Validation schemas
const renderSchema = Joi.object({
  content: Joi.string().required(),
  mermaid: Joi.boolean().optional()
})

const validateSchema = Joi.object({
  content: Joi.string().required()
})

const exportSchema = Joi.object({
  content: Joi.string().required(),
  filename: Joi.string().required()
})

const mermaidSchema = Joi.object({
  code: Joi.string().required()
})

// Validate Markdown syntax
router.post('/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = validateSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const result = markdownService.validateMarkdown(value.content)
    res.json(result)
  } catch (error) {
    console.error('Validation error:', error)
    res.status(500).json({ error: 'Validation failed' })
  }
})

// Render Markdown to HTML
router.post('/render', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = renderSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const html = markdownService.renderToHtml(value.content, { mermaid: value.mermaid })
    const metadata = markdownService.extractMetadata(value.content)

    res.json({ html, metadata })
  } catch (error) {
    console.error('Rendering error:', error)
    res.status(500).json({ error: 'Rendering failed' })
  }
})

// Render Mermaid diagram to SVG
router.post('/mermaid/render', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = mermaidSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const svg = await markdownService.renderMermaidToSvg(value.code)
    res.json({ svg })
  } catch (error) {
    console.error('Mermaid rendering error:', error)
    res.status(500).json({ error: 'Mermaid rendering failed' })
  }
})

// Export Markdown to HTML
router.post('/export/html', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = exportSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const html = markdownService.renderToHtml(value.content, { mermaid: true })
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${value.filename}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 900px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #2c3e50;
              margin-top: 2em;
              margin-bottom: 1em;
            }
            code {
              background: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Monaco', 'Menlo', monospace;
            }
            pre {
              background: #f8f8f8;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
            }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 0;
              padding-left: 1em;
              color: #666;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .table-of-contents {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 5px;
              margin: 2em 0;
            }
            .table-of-contents ul {
              list-style-type: none;
              padding-left: 20px;
            }
            .table-of-contents > ul {
              padding-left: 0;
            }
            .task-list-item {
              list-style: none;
            }
            .task-list-item input[type="checkbox"] {
              margin-right: 8px;
            }
            .footnotes {
              margin-top: 3em;
              padding-top: 2em;
              border-top: 1px solid #eee;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            mermaid.initialize({ startOnLoad: true, theme: 'default' });
          </script>
        </body>
      </html>
    `

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="${value.filename}.html"`)
    res.send(fullHtml)
  } catch (error) {
    console.error('HTML export error:', error)
    res.status(500).json({ error: 'HTML export failed' })
  }
})

// Export Markdown to PDF
router.post('/export/pdf', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = exportSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ error: error.details[0].message })
    }

    const pdf = await markdownService.exportToPdf(value.content, value.filename)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${value.filename}.pdf"`)
    res.send(pdf)
  } catch (error) {
    console.error('PDF export error:', error)
    res.status(500).json({ error: 'PDF export failed' })
  }
})

// Markdown templates (predefined)
const markdownTemplates = [
  {
    id: 'readme',
    name: 'README',
    description: 'Standard project README template',
    content: `# Project Title

## Description
Brief description of your project.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`javascript
// Example code
\`\`\`

## Features
- Feature 1
- Feature 2
- Feature 3

## Contributing
Pull requests are welcome.

## License
[MIT](https://choosealicense.com/licenses/mit/)`
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for meeting notes',
    content: `# Meeting Notes - [Date]

## Attendees
- [ ] Name 1
- [ ] Name 2

## Agenda
1. Topic 1
2. Topic 2

## Discussion Points

### Topic 1
- Point 1
- Point 2

## Action Items
- [ ] Action 1 - @assignee
- [ ] Action 2 - @assignee

## Next Meeting
Date: [Date]
Time: [Time]`
  },
  {
    id: 'technical-doc',
    name: 'Technical Documentation',
    description: 'Template for technical documentation',
    content: `# Technical Documentation

[[toc]]

## Overview
Provide a high-level overview of the system or component.

## Architecture
\`\`\`mermaid
graph TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
\`\`\`

## API Reference

### Endpoint: \`/api/endpoint\`
**Method:** GET
**Description:** Description of what this endpoint does.

#### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | string | Yes | Description |

#### Response
\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

## Examples
\`\`\`javascript
// Example implementation
const example = () => {
  return 'Hello World';
};
\`\`\`

## Troubleshooting
Common issues and their solutions.`
  },
  {
    id: 'math-doc',
    name: 'Mathematical Document',
    description: 'Template with math equations',
    content: `# Mathematical Documentation

## Equations

### Inline Math
The quadratic formula is $ax^2 + bx + c = 0$.

### Block Math
$$
x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}
$$

### Matrix
$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
$$

### Integral
$$
\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$`
  }
]

// Get Markdown templates
router.get('/templates', authenticateToken, async (req: Request, res: Response) => {
  res.json({ templates: markdownTemplates })
})

// Get specific template
router.get('/templates/:id', authenticateToken, async (req: Request, res: Response) => {
  const template = markdownTemplates.find(t => t.id === req.params.id)
  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }
  res.json(template)
})

export default router
