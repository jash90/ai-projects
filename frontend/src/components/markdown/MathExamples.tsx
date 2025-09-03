import React from 'react'
import { InlineMath, BlockMath, InlineLatex, BlockLatex, ReactKatex, ReactLatex } from './ReactKatex'

// Example component demonstrating both KaTeX and LaTeX usage
export const MathExamples: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Math Rendering Examples</h1>
      
      {/* KaTeX Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-green-600">KaTeX Examples</h2>
        
        <div>
          <h3 className="font-medium mb-2">Inline KaTeX:</h3>
          <p>
            The famous equation <InlineMath>E = mc^2</InlineMath> was derived by Einstein.
          </p>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Block KaTeX:</h3>
          <BlockMath>
            \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
          </BlockMath>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Complex KaTeX:</h3>
          <BlockMath>
            \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
          </BlockMath>
        </div>
      </section>
      
      {/* LaTeX Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-blue-600">LaTeX Examples</h2>
        
        <div>
          <h3 className="font-medium mb-2">Inline LaTeX:</h3>
          <p>
            The derivative of <InlineLatex>f(x) = x^2</InlineLatex> is <InlineLatex>f'(x) = 2x</InlineLatex>.
          </p>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Block LaTeX:</h3>
          <BlockLatex>
            \begin{pmatrix} a & b \\ c & d \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}
          </BlockLatex>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Complex LaTeX:</h3>
          <BlockLatex>
            \lim_{x \to \infty} \frac{1}{x} = 0
          </BlockLatex>
        </div>
      </section>
      
      {/* Mixed Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-purple-600">Mixed KaTeX and LaTeX</h2>
        
        <div>
          <p>
            Using KaTeX for simple math: <InlineMath>\alpha + \beta</InlineMath> and LaTeX for complex expressions: <InlineLatex>\frac{\partial f}{\partial x}</InlineLatex>
          </p>
        </div>
        
        <div>
          <BlockMath>
            \sin^2 \theta + \cos^2 \theta = 1
          </BlockMath>
        </div>
        
        <div>
          <BlockLatex>
            \nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
          </BlockLatex>
        </div>
      </section>
      
      {/* Usage Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-600">Usage Examples</h2>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Import and Usage:</h3>
          <pre className="text-sm">
{`// Import individual components
import { InlineMath, BlockMath, InlineLatex, BlockLatex } from '@/components/markdown'

// Import as objects
import { ReactKatex, ReactLatex } from '@/components/markdown'

// Usage
<InlineMath>E = mc^2</InlineMath>
<BlockMath>\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}</BlockMath>
<InlineLatex>f(x) = x^2</InlineLatex>
<BlockLatex>\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}</BlockLatex>`}
          </pre>
        </div>
      </section>
    </div>
  )
}

export default MathExamples
