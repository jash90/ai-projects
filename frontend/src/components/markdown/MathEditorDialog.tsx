import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathEditorDialogProps {
  open: boolean
  onClose: () => void
  onInsert: (latex: string) => void
}

const mathTemplates = {
  basic: [
    { name: 'Fraction', latex: '\\frac{a}{b}', display: '\\frac{a}{b}' },
    { name: 'Square root', latex: '\\sqrt{x}', display: '\\sqrt{x}' },
    { name: 'Nth root', latex: '\\sqrt[n]{x}', display: '\\sqrt[n]{x}' },
    { name: 'Power', latex: 'x^{n}', display: 'x^{n}' },
    { name: 'Subscript', latex: 'x_{n}', display: 'x_{n}' },
    { name: 'Combination', latex: '\\binom{n}{k}', display: '\\binom{n}{k}' }
  ],
  greek: [
    { name: 'Alpha', latex: '\\alpha', display: '\\alpha' },
    { name: 'Beta', latex: '\\beta', display: '\\beta' },
    { name: 'Gamma', latex: '\\gamma', display: '\\gamma' },
    { name: 'Delta', latex: '\\delta', display: '\\delta' },
    { name: 'Pi', latex: '\\pi', display: '\\pi' },
    { name: 'Sigma', latex: '\\sigma', display: '\\sigma' },
    { name: 'Theta', latex: '\\theta', display: '\\theta' },
    { name: 'Lambda', latex: '\\lambda', display: '\\lambda' }
  ],
  operators: [
    { name: 'Sum', latex: '\\sum_{i=1}^{n}', display: '\\sum_{i=1}^{n}' },
    { name: 'Product', latex: '\\prod_{i=1}^{n}', display: '\\prod_{i=1}^{n}' },
    { name: 'Integral', latex: '\\int_{a}^{b}', display: '\\int_{a}^{b}' },
    { name: 'Limit', latex: '\\lim_{x \\to \\infty}', display: '\\lim_{x \\to \\infty}' },
    { name: 'Partial derivative', latex: '\\frac{\\partial f}{\\partial x}', display: '\\frac{\\partial f}{\\partial x}' },
    { name: 'Nabla', latex: '\\nabla', display: '\\nabla' }
  ],
  relations: [
    { name: 'Less than or equal', latex: '\\leq', display: '\\leq' },
    { name: 'Greater than or equal', latex: '\\geq', display: '\\geq' },
    { name: 'Not equal', latex: '\\neq', display: '\\neq' },
    { name: 'Approximately', latex: '\\approx', display: '\\approx' },
    { name: 'Equivalent', latex: '\\equiv', display: '\\equiv' },
    { name: 'Proportional', latex: '\\propto', display: '\\propto' }
  ],
  matrices: [
    { name: '2x2 Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', display: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { name: '3x3 Matrix', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', display: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
    { name: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', display: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    { name: 'Column vector', latex: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', display: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}' }
  ],
  common: [
    { name: 'Quadratic formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', display: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' },
    { name: 'Binomial theorem', latex: '(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k', display: '(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k' },
    { name: 'Pythagorean theorem', latex: 'a^2 + b^2 = c^2', display: 'a^2 + b^2 = c^2' },
    { name: 'Euler\'s identity', latex: 'e^{i\\pi} + 1 = 0', display: 'e^{i\\pi} + 1 = 0' }
  ]
}

export function MathEditorDialog({ open, onClose, onInsert }: MathEditorDialogProps) {
  const [latex, setLatex] = useState('')
  const [isInline, setIsInline] = useState(true)
  const [renderedMath, setRenderedMath] = useState('')
  const [error, setError] = useState('')

  // Render LaTeX preview
  useEffect(() => {
    if (!latex) {
      setRenderedMath('')
      setError('')
      return
    }

    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !isInline,
        errorColor: '#cc0000'
      })
      setRenderedMath(html)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Invalid LaTeX syntax')
      setRenderedMath('')
    }
  }, [latex, isInline])

  const handleInsert = () => {
    if (latex) {
      const formatted = isInline ? `$${latex}$` : `$$\n${latex}\n$$`
      onInsert(formatted)
      setLatex('')
      onClose()
    }
  }

  const insertTemplate = (template: string) => {
    setLatex(latex + template)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Math Equation Editor</DialogTitle>
          <DialogDescription>
            Create mathematical equations using LaTeX syntax
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 flex flex-col gap-4 mt-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="latex-input">LaTeX Code</Label>
                <Textarea
                  id="latex-input"
                  value={latex}
                  onChange={(e) => setLatex(e.target.value)}
                  placeholder="Enter LaTeX code (e.g., x^2 + y^2 = r^2)"
                  className="font-mono h-32 mt-2"
                />
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Label>Preview</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isInline ? 'secondary' : 'ghost'}
                      onClick={() => setIsInline(true)}
                    >
                      Inline
                    </Button>
                    <Button
                      size="sm"
                      variant={!isInline ? 'secondary' : 'ghost'}
                      onClick={() => setIsInline(false)}
                    >
                      Block
                    </Button>
                  </div>
                </div>
                <Card className="h-32 flex items-center justify-center p-4 overflow-auto">
                  {renderedMath ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: renderedMath }}
                      className={cn(
                        'katex-preview',
                        !isInline && 'text-xl'
                      )}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Preview will appear here
                    </p>
                  )}
                </Card>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Quick reference:</p>
              <ul className="mt-1 space-y-1">
                <li>• Superscript: x^2 or x^{10}</li>
                <li>• Subscript: x_2 or x_{10}</li>
                <li>• Fraction: \frac{'{a}'}{'{b}'}</li>
                <li>• Square root: \sqrt{'{x}'}</li>
                <li>• Greek letters: \alpha, \beta, \gamma, \pi</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 pr-4">
                {Object.entries(mathTemplates).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-3">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {templates.map((template) => (
                        <Card
                          key={template.name}
                          className="p-3 cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => insertTemplate(template.latex)}
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {template.name}
                          </p>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: katex.renderToString(template.display, {
                                throwOnError: false,
                                displayMode: false
                              })
                            }}
                            className="text-center"
                          />
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!latex || !!error}>
            Insert Equation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}