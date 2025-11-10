# Mermaid Diagram Examples

This document demonstrates the various types of Mermaid diagrams now supported in the AI Projects Platform.

## 1. Flowchart

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

## 2. Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant AI

    User->>Frontend: Send message
    Frontend->>Backend: POST /api/chat
    Backend->>AI: Process request
    AI-->>Backend: Generate response
    Backend-->>Frontend: Stream response
    Frontend-->>User: Display message
```

## 3. Class Diagram

```mermaid
classDiagram
    class User {
        +String email
        +String password
        +Role role
        +login()
        +logout()
    }

    class Project {
        +String name
        +String description
        +User owner
        +createAgent()
        +deleteAgent()
    }

    class Agent {
        +String name
        +String model
        +String systemPrompt
        +chat()
    }

    User "1" --> "*" Project
    Project "1" --> "*" Agent
```

## 4. State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: User sends message
    Processing --> Streaming: AI starts response
    Streaming --> Complete: Response finished
    Complete --> Idle: Ready for next message
    Processing --> Error: API failure
    Error --> Idle: Retry
```

## 5. Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PROJECT : creates
    PROJECT ||--o{ AGENT : contains
    PROJECT ||--o{ FILE : has
    AGENT ||--o{ CONVERSATION : manages
    CONVERSATION ||--o{ MESSAGE : contains

    USER {
        int id PK
        string email
        string password_hash
        enum role
        int token_limit
    }

    PROJECT {
        int id PK
        int user_id FK
        string name
        text description
        jsonb metadata
    }

    AGENT {
        int id PK
        int project_id FK
        string name
        string model
        text system_prompt
    }
```

## 6. Gantt Chart

```mermaid
gantt
    title AI Projects Platform Development
    dateFormat  YYYY-MM-DD
    section Phase 1
    Research & Planning       :done, p1, 2024-01-01, 14d
    Backend Setup            :done, p2, 2024-01-15, 7d
    section Phase 2
    Frontend Development     :done, p3, 2024-01-22, 21d
    AI Integration          :done, p4, 2024-02-05, 14d
    section Phase 3
    Markdown Enhancement     :active, p5, 2024-02-19, 7d
    Security Improvements    :active, p6, 2024-02-22, 5d
    section Phase 4
    Testing & QA            :p7, 2024-02-27, 10d
    Production Deployment   :p8, 2024-03-08, 3d
```

## 7. Pie Chart

```mermaid
pie title Token Usage by Model
    "GPT-4" : 45
    "Claude-3-Sonnet" : 30
    "GPT-3.5-Turbo" : 20
    "Claude-3-Haiku" : 5
```

## 8. Git Graph

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Add backend"
    branch feature/frontend
    checkout feature/frontend
    commit id: "Add React setup"
    commit id: "Add components"
    checkout main
    merge feature/frontend
    branch feature/markdown
    checkout feature/markdown
    commit id: "Add Mermaid support"
    commit id: "Add security features"
    checkout main
    merge feature/markdown
    commit id: "Release v1.0"
```

## 9. User Journey

```mermaid
journey
    title User Journey: Creating an AI Agent
    section Sign Up
      Visit homepage: 5: User
      Create account: 3: User
      Verify email: 4: User
    section Create Project
      Click "New Project": 5: User
      Fill project details: 4: User
      Save project: 5: User
    section Configure Agent
      Click "Add Agent": 5: User
      Select AI model: 4: User
      Write system prompt: 3: User
      Test agent: 5: User, System
    section Use Agent
      Send message: 5: User
      Receive response: 5: User, AI
      Continue conversation: 5: User, AI
```

## 10. Mindmap

```mermaid
mindmap
  root((AI Projects Platform))
    Authentication
      JWT Tokens
      Refresh Tokens
      Role-based Access
    Projects
      Create/Edit/Delete
      File Management
      Metadata
    Agents
      OpenAI Integration
      Anthropic Integration
      Custom Prompts
      Token Tracking
    Chat
      Real-time WebSocket
      Message History
      Streaming Responses
    Markdown
      Editor
        Split View
        Preview Mode
        Auto-save
      Features
        Math Rendering
        Syntax Highlighting
        Mermaid Diagrams
        Tables & Lists
```

## Security Features

All markdown content is now sanitized using `rehype-sanitize` to prevent XSS attacks. This includes:

- ✅ Safe HTML rendering
- ✅ Script tag filtering
- ✅ Event handler removal
- ✅ Dangerous attribute sanitization

## Math Support

The platform also supports KaTeX math rendering:

Inline math: $E = mc^2$

Block math:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## Code Highlighting

```typescript
// TypeScript example with syntax highlighting
interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  return <div className="mermaid-wrapper" dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

```python
# Python example
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

## Testing Instructions

1. Create or edit a markdown file in the platform
2. Click the new **Mermaid diagram** button in the toolbar
3. The template will be inserted with a sample flowchart
4. Modify the diagram code and see it render in the preview pane
5. Try different diagram types from the examples above
6. Export to PDF to see diagrams in exported documents

## Notes

- Mermaid diagrams render with **strict security level** to prevent XSS
- Diagrams automatically adapt to light/dark mode
- Invalid diagram syntax will show a clear error message with details
- All diagrams are responsive and scroll horizontally on mobile devices
