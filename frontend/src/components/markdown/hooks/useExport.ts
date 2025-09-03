import { useCallback } from 'react'

export function useExport() {
  const exportToFormat = useCallback(async (
    content: string, 
    filename: string, 
    format: 'html' | 'pdf' | 'docx'
  ) => {
    if (!content) {
      console.warn('No content to export.')
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || '/api'

    try {
      if (format === 'html') {
        // Create HTML file with proper styling
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
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
    </style>
</head>
<body>
    <div id="markdown-content">${content}</div>
</body>
</html>`
        
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (format === 'pdf') {
        // Use backend for PDF generation for better quality and complex rendering
        const response = await fetch(`${apiUrl}/markdown/export/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, filename }),
        })
        if (!response.ok) throw new Error('Failed to export PDF')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (format === 'docx') {
        // Placeholder for DOCX export - requires a more complex backend service
        alert('DOCX export is not yet implemented. Please try HTML or PDF.')
        console.warn('DOCX export not implemented.')
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error)
      throw error
    }
  }, [])

  return { exportToFormat }
}
