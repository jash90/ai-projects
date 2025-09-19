import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import MarkdownIt from 'markdown-it'
import ErrorBoundary from '../ErrorBoundary'
import markdownItKatex from 'markdown-it-katex'
import markdownItEmoji from 'markdown-it-emoji'
import markdownItTaskLists from 'markdown-it-task-lists'
import markdownItAnchor from 'markdown-it-anchor'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import { cn } from '@/lib/utils'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface EnhancedMarkdownPreviewProps {
  content: string
  className?: string
  theme?: 'light' | 'dark'
}

// CSS custom properties type
type ProseStyles = {
  [key: string]: string
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#bb2528',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7C0000',
    lineColor: '#F8B229',
    secondaryColor: '#006100',
    tertiaryColor: '#fff',
    background: '#1a1a1a',
    mainBkg: '#2a2a2a',
    secondBkg: '#3a3a3a',
    tertiaryBkg: '#4a4a4a'
  }
})

function EnhancedMarkdownPreviewBase({
  content,
  className,
  theme = 'dark'
}: EnhancedMarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [tocContent, setTocContent] = useState<Array<{ level: number; text: string; id: string }>>([])
  const mermaidIdRef = useRef(0)

  // Configure markdown-it
  const md = useRef<MarkdownIt>()

  useEffect(() => {
    // Initialize markdown-it with plugins
    md.current = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value
          } catch (__) {}
        }
        return ''
      }
    })
      .use(markdownItKatex, {
        throwOnError: false,
        errorColor: '#cc0000'
      })
      .use(markdownItEmoji)
      .use(markdownItTaskLists, {
        enabled: true,
        label: true,
        labelAfter: true
      })
      .use(markdownItAnchor, {
        permalink: markdownItAnchor.permalink.ariaHidden({
          placement: 'before',
          symbol: '#'
        }),
        level: [1, 2, 3, 4],
        slugify: (s: string) => s.toLowerCase().replace(/[^\w]+/g, '-')
      })

    // Custom renderer for mermaid blocks
    const defaultFence = md.current.renderer.rules.fence
    md.current.renderer.rules.fence = function (tokens, idx, options, env, renderer) {
      const token = tokens[idx]
      const info = token.info ? token.info.trim() : ''

      if (info === 'mermaid') {
        const graphId = `mermaid-${++mermaidIdRef.current}-${Date.now()}`
        return `<div class="mermaid" id="${graphId}">${token.content}</div>`
      }

      if (defaultFence) {
        return defaultFence(tokens, idx, options, env, renderer)
      }
      return ''
    }

    // Custom renderer for table of contents
    md.current.renderer.rules.toc_open = () => '<nav class="table-of-contents">'
    md.current.renderer.rules.toc_close = () => '</nav>'
  }, [])

  // Memoize markdown rendering function
  const renderMarkdown = useCallback((markdown: string) => {
    if (!md.current) return { html: '', headings: [] }

    try {
      // Extract TOC if [[toc]] is present
      const tocMarker = '[[toc]]'
      const hasToc = markdown.includes(tocMarker)

      let processedContent = markdown
      const headings: Array<{ level: number; text: string; id: string }> = []

      if (hasToc) {
        // Extract headings for TOC
        const lines = markdown.split('\n')
        lines.forEach(line => {
          const match = line.match(/^(#{1,4})\s+(.+)$/)
          if (match) {
            const level = match[1].length
            const text = match[2]
            const id = text.toLowerCase().replace(/[^\w]+/g, '-')
            headings.push({ level, text, id })
          }
        })

        // Generate TOC HTML
        let tocHtml = '<nav class="table-of-contents"><ul>'
        let currentLevel = 1
        headings.forEach(heading => {
          if (heading.level > currentLevel) {
            tocHtml += '<ul>'.repeat(heading.level - currentLevel)
          } else if (heading.level < currentLevel) {
            tocHtml += '</ul>'.repeat(currentLevel - heading.level)
          }
          tocHtml += `<li><a href="#${heading.id}">${heading.text}</a></li>`
          currentLevel = heading.level
        })
        tocHtml += '</ul>'.repeat(currentLevel) + '</nav>'

        // Replace TOC marker with generated TOC
        processedContent = processedContent.replace(tocMarker, tocHtml)
      }

      // Render markdown
      const rawHtml = md.current.render(processedContent)

      // Enhanced HTML sanitization with multiple layers
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        // Strictly limit allowed tags
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
          'code', 'pre', 'kbd', 'samp', 'var',
          'a', 'img',
          'ul', 'ol', 'li',
          'dl', 'dt', 'dd',
          'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
          'blockquote', 'q', 'cite',
          'div', 'span', 'nav',
          'input', // for checkboxes in task lists
          'sup', 'sub', // for footnotes
          'details', 'summary' // for collapsible content
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'target', 'rel', 'id', 'class',
          'src', 'alt', 'width', 'height',
          'type', 'checked', 'disabled', // for checkboxes
          'colspan', 'rowspan', // for tables
          'start', 'reversed', // for lists
          'data-*' // for custom data attributes
        ],
        // Security settings
        FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        ALLOW_DATA_ATTR: false, // Disable data attributes to prevent attribute-based XSS
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SAFE_FOR_TEMPLATES: true,
        RETURN_TRUSTED_TYPE: false,
        // URL sanitization
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        // Custom hooks for additional sanitization
        ADD_TAGS: [],
        ADD_ATTR: [],
        // Prevent DOM clobbering
        SANITIZE_DOM: true,
        // Keep content safe for jQuery
        SAFE_FOR_JQUERY: true
      })

      // Additional XSS protection: escape any remaining suspicious patterns
      const doubleCleanHtml = cleanHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')

      return { html: doubleCleanHtml, headings }
    } catch (error) {
      console.error('Markdown rendering error:', error)
      return { html: '<p>Error rendering markdown</p>', headings: [] }
    }
  }, [])

  // Render markdown to HTML with debouncing
  useEffect(() => {
    if (!md.current) return

    // Debounce rendering for performance
    const timeoutId = setTimeout(() => {
      const { html, headings } = renderMarkdown(content)
      setRenderedHtml(html)
      setTocContent(headings)
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [content, renderMarkdown])

  // Render mermaid diagrams after HTML is rendered
  useEffect(() => {
    if (!previewRef.current || !renderedHtml) return

    let isCancelled = false
    const renderMermaidDiagrams = async () => {
      const mermaidElements = previewRef.current?.querySelectorAll('.mermaid')
      if (!mermaidElements || mermaidElements.length === 0) return

      for (const element of mermaidElements) {
        if (isCancelled) break // Stop rendering if component unmounts

        const graphId = element.id
        const graphCode = element.textContent || ''

        try {
          const { svg } = await mermaid.render(graphId, graphCode)
          if (!isCancelled && element) {
            element.innerHTML = svg
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          if (!isCancelled && element) {
            element.innerHTML = `<pre class="error">Error rendering diagram: ${error}</pre>`
          }
        }
      }
    }

    // Debounce mermaid rendering for performance
    const timeoutId = setTimeout(renderMermaidDiagrams, 100)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [renderedHtml])

  // Handle checkbox clicks for task lists
  useEffect(() => {
    const element = previewRef.current
    if (!element) return

    const handleCheckboxClick = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.type === 'checkbox' && target.classList.contains('task-list-item-checkbox')) {
        e.preventDefault()
        // You can implement task list interaction here if needed
      }
    }

    element.addEventListener('click', handleCheckboxClick)
    return () => {
      element.removeEventListener('click', handleCheckboxClick)
    }
  }, [renderedHtml])

  return (
    <div
      ref={previewRef}
      className={cn(
        'markdown-preview prose prose-invert max-w-none',
        theme === 'dark' ? 'prose-invert' : '',
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      style={({
        '--tw-prose-body': theme === 'dark' ? '#e5e7eb' : '#374151',
        '--tw-prose-headings': theme === 'dark' ? '#f3f4f6' : '#111827',
        '--tw-prose-links': theme === 'dark' ? '#60a5fa' : '#2563eb',
        '--tw-prose-bold': theme === 'dark' ? '#f3f4f6' : '#111827',
        '--tw-prose-counters': theme === 'dark' ? '#9ca3af' : '#6b7280',
        '--tw-prose-bullets': theme === 'dark' ? '#9ca3af' : '#6b7280',
        '--tw-prose-hr': theme === 'dark' ? '#374151' : '#e5e7eb',
        '--tw-prose-quotes': theme === 'dark' ? '#f3f4f6' : '#111827',
        '--tw-prose-quote-borders': theme === 'dark' ? '#374151' : '#e5e7eb',
        '--tw-prose-captions': theme === 'dark' ? '#9ca3af' : '#6b7280',
        '--tw-prose-code': theme === 'dark' ? '#f3f4f6' : '#111827',
        '--tw-prose-pre-code': theme === 'dark' ? '#e5e7eb' : '#374151',
        '--tw-prose-pre-bg': theme === 'dark' ? '#1f2937' : '#f3f4f6',
        '--tw-prose-th-borders': theme === 'dark' ? '#4b5563' : '#d1d5db',
        '--tw-prose-td-borders': theme === 'dark' ? '#374151' : '#e5e7eb'
      } as ProseStyles & React.CSSProperties)}
    />
  )
}

// Export the component wrapped with error boundary
export function EnhancedMarkdownPreview(props: EnhancedMarkdownPreviewProps) {
  return (
    <ErrorBoundary componentName="EnhancedMarkdownPreview">
      <EnhancedMarkdownPreviewBase {...props} />
    </ErrorBoundary>
  )
}