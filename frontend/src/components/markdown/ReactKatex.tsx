import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// LaTeX rendering using KaTeX (since react-latex is not available)
const renderLatex = (latex: string, displayMode: boolean = false): string => {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      strict: false,
    })
  } catch (error) {
    return `<span style="color: #cc0000;">LaTeX Error: ${latex}</span>`
  }
}

// React-Katex compatible components
interface InlineMathProps {
  children: string
  errorColor?: string
  renderError?: (error: Error) => React.ReactNode
  math?: string
}

interface BlockMathProps {
  children: string
  errorColor?: string
  renderError?: (error: Error) => React.ReactNode
  math?: string
}

export const InlineMath: React.FC<InlineMathProps> = ({ 
  children, 
  math,
  errorColor = '#cc0000',
  renderError 
}) => {
  const mathContent = math || children
  
  try {
    const html = katex.renderToString(mathContent, {
      throwOnError: false,
      displayMode: false,
      strict: false,
      errorColor,
    })
    return <span className="math-inline bg-muted/50 px-1 py-0.5 rounded text-sm" dangerouslySetInnerHTML={{ __html: html }} />
  } catch (error) {
    if (renderError) {
      return <span>{renderError(error as Error)}</span>
    }
    return <span className="text-red-500" style={{ color: errorColor }}>Math Error: {mathContent}</span>
  }
}

export const BlockMath: React.FC<BlockMathProps> = ({ 
  children, 
  math,
  errorColor = '#cc0000',
  renderError 
}) => {
  const mathContent = math || children
  
  try {
    const html = katex.renderToString(mathContent, {
      throwOnError: false,
      displayMode: true,
      strict: false,
      errorColor,
    })
    return (
      <div className="math-block my-4 p-4 bg-muted/30 rounded-lg border border-border text-center" dangerouslySetInnerHTML={{ __html: html }} />
    )
  } catch (error) {
    if (renderError) {
      return <div className="p-4 border border-red-500 rounded">{renderError(error as Error)}</div>
    }
    return <div className="text-red-500 p-4 border border-red-500 rounded" style={{ color: errorColor }}>Math Error: {mathContent}</div>
  }
}

// LaTeX Components (using KaTeX for rendering)
interface InlineLatexProps {
  children: string
  errorColor?: string
  renderError?: (error: Error) => React.ReactNode
  latex?: string
}

interface BlockLatexProps {
  children: string
  errorColor?: string
  renderError?: (error: Error) => React.ReactNode
  latex?: string
}

export const InlineLatex: React.FC<InlineLatexProps> = ({ 
  children, 
  latex,
  errorColor = '#cc0000',
  renderError 
}) => {
  const latexContent = latex || children
  
  try {
    const html = renderLatex(latexContent, false)
    return <span className="latex-inline bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded text-sm border border-blue-200 dark:border-blue-800" dangerouslySetInnerHTML={{ __html: html }} />
  } catch (error) {
    if (renderError) {
      return <span>{renderError(error as Error)}</span>
    }
    return <span className="text-red-500" style={{ color: errorColor }}>LaTeX Error: {latexContent}</span>
  }
}

export const BlockLatex: React.FC<BlockLatexProps> = ({ 
  children, 
  latex,
  errorColor = '#cc0000',
  renderError 
}) => {
  const latexContent = latex || children
  
  try {
    const html = renderLatex(latexContent, true)
    return (
      <div className="latex-block my-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center" dangerouslySetInnerHTML={{ __html: html }} />
    )
  } catch (error) {
    if (renderError) {
      return <div className="p-4 border border-red-500 rounded">{renderError(error as Error)}</div>
    }
    return <div className="text-red-500 p-4 border border-red-500 rounded" style={{ color: errorColor }}>LaTeX Error: {latexContent}</div>
  }
}

// React-Katex and React-LaTeX style default export
const ReactKatex = {
  InlineMath,
  BlockMath,
  InlineLatex,
  BlockLatex,
}

// React-LaTeX style export
const ReactLatex = {
  InlineLatex,
  BlockLatex,
}

export default ReactKatex
export { ReactLatex }
