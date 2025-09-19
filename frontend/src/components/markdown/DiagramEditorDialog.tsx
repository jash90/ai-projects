import { useState, useEffect, useRef } from 'react'
import ErrorBoundary from '../ErrorBoundary'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import mermaid from 'mermaid'
import { AlertCircle, Info } from 'lucide-react'

interface DiagramEditorDialogProps {
  open: boolean
  onClose: () => void
  onInsert: (code: string) => void
}

const diagramTemplates = {
  flowchart: [
    {
      name: 'Basic Flow',
      code: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]`
    },
    {
      name: 'Decision Tree',
      code: `graph TD
    A[Hard edge] -->|Link text| B(Round edge)
    B --> C{Decision}
    C -->|One| D[Result one]
    C -->|Two| E[Result two]`
    },
    {
      name: 'Process Flow',
      code: `graph LR
    A[Square Rect] -- Link text --> B((Circle))
    A --> C(Round Rect)
    B --> D{Rhombus}
    C --> D`
    }
  ],
  sequence: [
    {
      name: 'Basic Sequence',
      code: `sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice-)John: See you later!`
    },
    {
      name: 'With Loop',
      code: `sequenceDiagram
    Alice->>Bob: Hello Bob, how are you?
    alt is sick
        Bob->>Alice: Not so good :(
    else is well
        Bob->>Alice: Feeling fresh like a daisy
    end
    opt Extra response
        Bob->>Alice: Thanks for asking
    end`
    }
  ],
  classDiagram: [
    {
      name: 'Basic Class',
      code: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }`
    },
    {
      name: 'Relationships',
      code: `classDiagram
    classA --|> classB : Inheritance
    classC --* classD : Composition
    classE --o classF : Aggregation
    classG --> classH : Association
    classI -- classJ : Link(Solid)
    classK ..> classL : Dependency
    classM ..|> classN : Realization`
    }
  ],
  stateDiagram: [
    {
      name: 'Basic States',
      code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`
    },
    {
      name: 'With Conditions',
      code: `stateDiagram-v2
    state if_state <<choice>>
    [*] --> IsPositive
    IsPositive --> if_state
    if_state --> False: if n < 0
    if_state --> True : if n >= 0`
    }
  ],
  erDiagram: [
    {
      name: 'Entity Relationship',
      code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`
    },
    {
      name: 'With Attributes',
      code: `erDiagram
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
    ORDER {
        int orderNumber
        string deliveryAddress
    }
    CUSTOMER ||--o{ ORDER : places`
    }
  ],
  gantt: [
    {
      name: 'Project Timeline',
      code: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d`
    }
  ],
  pie: [
    {
      name: 'Basic Pie Chart',
      code: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`
    }
  ],
  gitGraph: [
    {
      name: 'Git Flow',
      code: `gitGraph
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit`
    }
  ]
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#bb2528',
    primaryTextColor: '#fff',
    primaryBorderColor: '#7C0000',
    lineColor: '#F8B229'
  }
})

function DiagramEditorDialogBase({ open, onClose, onInsert }: DiagramEditorDialogProps) {
  const [code, setCode] = useState('')
  const [diagramType, setDiagramType] = useState<keyof typeof diagramTemplates>('flowchart')
  const [error, setError] = useState('')
  const [renderedDiagram, setRenderedDiagram] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const renderIdRef = useRef(0)

  // Render diagram preview
  useEffect(() => {
    if (!code || !previewRef.current) {
      setRenderedDiagram('')
      setError('')
      return
    }

    const renderDiagram = async () => {
      try {
        const graphId = `mermaid-preview-${++renderIdRef.current}`
        const { svg } = await mermaid.render(graphId, code)
        setRenderedDiagram(svg)
        setError('')
      } catch (err) {
        setError(err?.message || 'Invalid diagram syntax')
        setRenderedDiagram('')
      }
    }

    const timeoutId = setTimeout(renderDiagram, 500)
    return () => clearTimeout(timeoutId)
  }, [code])

  const handleInsert = () => {
    if (code) {
      onInsert(code)
      setCode('')
      onClose()
    }
  }

  const insertTemplate = (templateCode: string) => {
    setCode(templateCode)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Diagram Editor (Mermaid)</DialogTitle>
          <DialogDescription>
            Create diagrams using Mermaid syntax
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4">
          {/* Left side - Editor */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <Label htmlFor="mermaid-input">Diagram Code</Label>
              <Textarea
                id="mermaid-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter Mermaid diagram code..."
                className="font-mono h-64 mt-2"
                spellCheck={false}
              />
              {error && (
                <Alert className="mt-2" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <Label>Quick Reference</Label>
              <Card className="p-3 mt-2">
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Flowchart:</strong> graph TD/LR/TB/RL</p>
                  <p><strong>Nodes:</strong> A[Rectangle] B(Rounded) C{'{'}Diamond{'}'} D((Circle))</p>
                  <p><strong>Links:</strong> A --{'>'} B, A --|text|--{'>'} B</p>
                  <p><strong>Sequence:</strong> Alice-{'>'}{'>'} Bob: Message</p>
                  <p><strong>Class:</strong> class Name {'{'} +method() {'}'}</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Right side - Preview and Templates */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1">
              <Label>Preview</Label>
              <Card className="h-64 mt-2 overflow-auto">
                <div
                  ref={previewRef}
                  className="p-4 flex items-center justify-center min-h-full"
                >
                  {renderedDiagram ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: renderedDiagram }}
                      className="mermaid-preview"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Preview will appear here
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div>
              <Label>Templates</Label>
              <Tabs
                value={diagramType}
                onValueChange={(value) => setDiagramType(value as keyof typeof diagramTemplates)}
                className="mt-2"
              >
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="flowchart">Flow</TabsTrigger>
                  <TabsTrigger value="sequence">Sequence</TabsTrigger>
                  <TabsTrigger value="classDiagram">Class</TabsTrigger>
                  <TabsTrigger value="erDiagram">ER</TabsTrigger>
                </TabsList>

                {Object.entries(diagramTemplates).map(([type, templates]) => (
                  <TabsContent key={type} value={type} className="mt-2">
                    <ScrollArea className="h-32">
                      <div className="space-y-2 pr-4">
                        {templates.map((template) => (
                          <Card
                            key={template.name}
                            className="p-2 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => insertTemplate(template.code)}
                          >
                            <p className="text-sm font-medium">{template.name}</p>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Mermaid supports flowcharts, sequence diagrams, class diagrams, state diagrams,
            entity relationship diagrams, Gantt charts, pie charts, and git graphs.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!code || !!error}>
            Insert Diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export the component wrapped with error boundary
export function DiagramEditorDialog(props: DiagramEditorDialogProps) {
  return (
    <ErrorBoundary componentName="DiagramEditorDialog">
      <DiagramEditorDialogBase {...props} />
    </ErrorBoundary>
  )
}