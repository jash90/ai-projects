import React, { useEffect, useRef, useState } from 'react'
import MarkdownIt from 'markdown-it'
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

export function EnhancedMarkdownPreview({
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

  // Render markdown to HTML
  useEffect(() => {
    if (!md.current) return

    try {
      // Extract TOC if [[toc]] is present
      const tocMarker = '[[toc]]'
      const hasToc = content.includes(tocMarker)

      let processedContent = content
      const headings: Array<{ level: number; text: string; id: string }> = []

      if (hasToc) {
        // Extract headings for TOC
        const lines = content.split('\n')
        lines.forEach(line => {
          const match = line.match(/^(#{1,4})\s+(.+)$/)
          if (match) {
            const level = match[1].length
            const text = match[2]
            const id = text.toLowerCase().replace(/[^\w]+/g, '-')
            headings.push({ level, text, id })
          }
        })
        setTocContent(headings)

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

      // Sanitize HTML
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['target', 'rel', 'style'],
        ALLOW_DATA_ATTR: true
      })

      setRenderedHtml(cleanHtml)
    } catch (error) {
      console.error('Markdown rendering error:', error)
      setRenderedHtml('<p>Error rendering markdown</p>')
    }
  }, [content])

  // Render mermaid diagrams after HTML is rendered
  useEffect(() => {
    if (!previewRef.current) return

    const renderMermaidDiagrams = async () => {
      const mermaidElements = previewRef.current?.querySelectorAll('.mermaid')
      if (!mermaidElements || mermaidElements.length === 0) return

      for (const element of mermaidElements) {
        const graphId = element.id
        const graphCode = element.textContent || ''

        try {
          const { svg } = await mermaid.render(graphId, graphCode)
          element.innerHTML = svg
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          element.innerHTML = `<pre class="error">Error rendering diagram: ${error}</pre>`
        }
      }
    }

    renderMermaidDiagrams()
  }, [renderedHtml])

  // Handle checkbox clicks for task lists
  useEffect(() => {
    if (!previewRef.current) return

    const handleCheckboxClick = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.type === 'checkbox' && target.classList.contains('task-list-item-checkbox')) {
        e.preventDefault()
        // You can implement task list interaction here if needed
      }
    }

    previewRef.current.addEventListener('click', handleCheckboxClick)
    return () => {
      previewRef.current?.removeEventListener('click', handleCheckboxClick)
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
      style={{
        ['--tw-prose-body' as any]: theme === 'dark' ? '#e5e7eb' : '#374151',
        ['--tw-prose-headings' as any]: theme === 'dark' ? '#f3f4f6' : '#111827',
        ['--tw-prose-links' as any]: theme === 'dark' ? '#60a5fa' : '#2563eb',
        ['--tw-prose-bold' as any]: theme === 'dark' ? '#f3f4f6' : '#111827',
        ['--tw-prose-counters' as any]: theme === 'dark' ? '#9ca3af' : '#6b7280',
        ['--tw-prose-bullets' as any]: theme === 'dark' ? '#9ca3af' : '#6b7280',
        ['--tw-prose-hr' as any]: theme === 'dark' ? '#374151' : '#e5e7eb',
        ['--tw-prose-quotes' as any]: theme === 'dark' ? '#f3f4f6' : '#111827',
        ['--tw-prose-quote-borders' as any]: theme === 'dark' ? '#374151' : '#e5e7eb',
        ['--tw-prose-captions' as any]: theme === 'dark' ? '#9ca3af' : '#6b7280',
        ['--tw-prose-code' as any]: theme === 'dark' ? '#f3f4f6' : '#111827',
        ['--tw-prose-pre-code' as any]: theme === 'dark' ? '#e5e7eb' : '#374151',
        ['--tw-prose-pre-bg' as any]: theme === 'dark' ? '#1f2937' : '#f3f4f6',
        ['--tw-prose-th-borders' as any]: theme === 'dark' ? '#4b5563' : '#d1d5db',
        ['--tw-prose-td-borders' as any]: theme === 'dark' ? '#374151' : '#e5e7eb'
      }}
    />
  )
}