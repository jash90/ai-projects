import React, { useState, useEffect } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  FileText,
  Users,
  Code,
  Calculator,
  BookOpen,
  GitBranch,
  Lightbulb,
  FileJson,
  Search
} from 'lucide-react'
import apiClient from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface TemplateSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (content: string) => void
}

interface Template {
  id: string
  name: string
  description: string
  content: string
  category?: string
  icon?: React.ElementType
}

// Local templates (available offline)
const localTemplates: Template[] = [
  {
    id: 'readme',
    name: 'README',
    category: 'documentation',
    description: 'Standard project README template',
    icon: FileText,
    content: `# Project Title

## Description
Brief description of your project.

## Table of Contents
[[toc]]

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
// Example code
const example = () => {
  return 'Hello World';
};
\`\`\`

## Features

- ✨ Feature 1
- 🚀 Feature 2
- 💡 Feature 3

## API Reference

### \`functionName(param1, param2)\`

Description of the function.

**Parameters:**
- \`param1\` (Type): Description
- \`param2\` (Type): Description

**Returns:** Description of return value

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Contact

Your Name - [@yourhandle](https://twitter.com/yourhandle)

Project Link: [https://github.com/yourusername/projectname](https://github.com/yourusername/projectname)`
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'business',
    description: 'Template for meeting notes with action items',
    icon: Users,
    content: `# Meeting Notes - [Date]

## Meeting Details
- **Date:** [Date]
- **Time:** [Start] - [End]
- **Location:** [Location/Virtual]
- **Facilitator:** [Name]

## Attendees
- [x] Name 1 (Present)
- [ ] Name 2 (Absent)
- [x] Name 3 (Present)

## Agenda
1. Topic 1
2. Topic 2
3. Topic 3

## Discussion Points

### Topic 1: [Title]
**Presenter:** [Name]

Key points discussed:
- Point 1
- Point 2
- Point 3

**Decisions Made:**
- Decision 1
- Decision 2

### Topic 2: [Title]
**Presenter:** [Name]

Discussion summary...

## Action Items
| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Action 1 | @person1 | 2024-01-15 | 🔄 In Progress |
| Action 2 | @person2 | 2024-01-20 | ⏳ Pending |
| Action 3 | @person3 | 2024-01-18 | ✅ Complete |

## Next Meeting
- **Date:** [Date]
- **Time:** [Time]
- **Agenda Items to Prepare:**
  - [ ] Item 1
  - [ ] Item 2

## Notes
Additional notes or parking lot items...`
  },
  {
    id: 'technical-doc',
    name: 'Technical Documentation',
    category: 'documentation',
    description: 'Comprehensive technical documentation template',
    icon: BookOpen,
    content: `# Technical Documentation

## Table of Contents
[[toc]]

## Overview
Provide a high-level overview of the system or component being documented.

### Purpose
Explain the purpose and goals of this system/component.

### Scope
Define what is and isn't covered in this documentation.

## Architecture

### System Architecture
\`\`\`mermaid
graph TB
    A[Client] --> B[API Gateway]
    B --> C[Service 1]
    B --> D[Service 2]
    C --> E[Database]
    D --> E
\`\`\`

### Components
1. **Component A**: Description
2. **Component B**: Description
3. **Component C**: Description

## Installation & Setup

### Prerequisites
- Requirement 1
- Requirement 2
- Requirement 3

### Installation Steps
1. Clone the repository
   \`\`\`bash
   git clone https://github.com/user/repo.git
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Configure environment
   \`\`\`bash
   cp .env.example .env
   \`\`\`

## API Reference

### Authentication
All API requests require authentication using Bearer tokens.

\`\`\`http
Authorization: Bearer <token>
\`\`\`

### Endpoints

#### GET /api/v1/resource
Retrieves a list of resources.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 10) |

**Response:**
\`\`\`json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Resource 1"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 100
  }
}
\`\`\`

## Configuration

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | Database connection string | - | Yes |
| API_KEY | API authentication key | - | Yes |
| PORT | Server port | 3000 | No |

## Deployment

### Production Deployment
1. Build the application
2. Run migrations
3. Start the service

### Monitoring
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`

## Troubleshooting

### Common Issues
1. **Issue:** Connection refused
   **Solution:** Check if the service is running

2. **Issue:** Authentication failed
   **Solution:** Verify API key is correct

## Changelog
- v1.0.0 - Initial release
- v1.1.0 - Added feature X
- v1.2.0 - Performance improvements`
  },
  {
    id: 'math-doc',
    name: 'Mathematical Document',
    category: 'academic',
    description: 'Document with mathematical equations and proofs',
    icon: Calculator,
    content: `# Mathematical Analysis

## Introduction
This document explores mathematical concepts and proofs.

## Definitions

### Definition 1: Limit
The limit of a function $f(x)$ as $x$ approaches $a$ is $L$ if:

$$\\lim_{x \\to a} f(x) = L$$

This means that for every $\\epsilon > 0$, there exists a $\\delta > 0$ such that:

$$0 < |x - a| < \\delta \\implies |f(x) - L| < \\epsilon$$

## Theorems

### Theorem 1: Fundamental Theorem of Calculus
If $f$ is continuous on $[a, b]$ and $F$ is an antiderivative of $f$ on $[a, b]$, then:

$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$

### Proof:
Let $F(x) = \\int_{a}^{x} f(t)\\,dt$

By the definition of derivative:
$$F'(x) = \\lim_{h \\to 0} \\frac{F(x+h) - F(x)}{h}$$

## Examples

### Example 1: Quadratic Formula
For the equation $ax^2 + bx + c = 0$ where $a \\neq 0$:

$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

### Example 2: Integration by Parts
$$\\int u\\,dv = uv - \\int v\\,du$$

### Example 3: Taylor Series
The Taylor series of $f(x)$ centered at $a$ is:

$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n$$

## Matrices

### Matrix Operations
Given matrices:

$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}, \\quad B = \\begin{pmatrix} e & f \\\\ g & h \\end{pmatrix}$$

Matrix multiplication:
$$AB = \\begin{pmatrix} ae+bg & af+bh \\\\ ce+dg & cf+dh \\end{pmatrix}$$

Determinant:
$$\\det(A) = ad - bc$$

## Conclusion
Mathematical notation in Markdown using KaTeX provides clear and professional documentation.`
  },
  {
    id: 'project-proposal',
    name: 'Project Proposal',
    category: 'business',
    description: 'Professional project proposal template',
    icon: Lightbulb,
    content: `# Project Proposal: [Project Name]

## Executive Summary
Brief overview of the project proposal (2-3 paragraphs).

## Problem Statement
### Current Situation
Description of the current state and challenges.

### Pain Points
- Pain point 1
- Pain point 2
- Pain point 3

## Proposed Solution
### Overview
High-level description of the proposed solution.

### Key Features
1. **Feature 1**: Description
2. **Feature 2**: Description
3. **Feature 3**: Description

## Benefits & Value Proposition
- 🎯 Benefit 1: Impact description
- 📈 Benefit 2: Impact description
- 💰 Benefit 3: Impact description

## Implementation Plan

### Timeline
\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Planning           :2024-01-01, 14d
    Design            :14d
    section Phase 2
    Development       :2024-02-01, 30d
    Testing          :15d
    section Phase 3
    Deployment       :2024-03-15, 7d
    Training         :7d
\`\`\`

### Milestones
| Milestone | Description | Target Date | Deliverables |
|-----------|-------------|-------------|--------------|
| M1 | Project Kickoff | 2024-01-01 | Charter, Team |
| M2 | Design Complete | 2024-01-31 | Design Docs |
| M3 | Beta Release | 2024-03-01 | Working Prototype |
| M4 | Go Live | 2024-03-31 | Final Product |

## Budget Estimate
| Category | Amount | Notes |
|----------|--------|-------|
| Development | $50,000 | 500 hours @ $100/hr |
| Design | $10,000 | UI/UX design |
| Infrastructure | $5,000 | Cloud services |
| **Total** | **$65,000** | |

## Risk Analysis
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep | Medium | High | Clear requirements, change control |
| Technical challenges | Low | Medium | Prototype early, technical spikes |
| Resource availability | Medium | Medium | Buffer in timeline |

## Success Criteria
- ✅ Criterion 1
- ✅ Criterion 2
- ✅ Criterion 3

## Next Steps
1. Approve proposal
2. Assemble team
3. Kick-off meeting
4. Begin Phase 1

## Appendices
- A: Technical Specifications
- B: Market Research
- C: Competitor Analysis`
  },
  {
    id: 'api-spec',
    name: 'API Specification',
    category: 'technical',
    description: 'REST API specification template',
    icon: Code,
    content: `# API Specification

## Overview
API Version: v1.0.0
Base URL: \`https://api.example.com/v1\`

## Authentication
This API uses Bearer token authentication.

\`\`\`http
Authorization: Bearer <your-token>
\`\`\`

## Rate Limiting
- 1000 requests per hour per API key
- Rate limit headers included in response

## Endpoints

### Users

#### GET /users
Get a list of users.

**Query Parameters:**
\`\`\`
page: integer (default: 1)
limit: integer (default: 20, max: 100)
sort: string (created_at | updated_at)
order: string (asc | desc)
\`\`\`

**Response 200:**
\`\`\`json
{
  "data": [
    {
      "id": "123",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
\`\`\`

#### GET /users/:id
Get a specific user by ID.

**Response 200:**
\`\`\`json
{
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

#### POST /users
Create a new user.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}
\`\`\`

**Response 201:**
\`\`\`json
{
  "data": {
    "id": "124",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

#### PUT /users/:id
Update a user.

**Request Body:**
\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
\`\`\`

#### DELETE /users/:id
Delete a user.

**Response 204:** No content

## Error Responses

### Error Format
\`\`\`json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
\`\`\`

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 422 | Validation failed |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

## Webhooks

### Event Types
- user.created
- user.updated
- user.deleted

### Webhook Payload
\`\`\`json
{
  "id": "evt_123",
  "type": "user.created",
  "created": "2024-01-01T00:00:00Z",
  "data": {
    // Event specific data
  }
}
\`\`\``
  }
]

function TemplateSelectorBase({ open, onClose, onSelect }: TemplateSelectorProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [templates, setTemplates] = useState<Template[]>(localTemplates)
  const [loading, setLoading] = useState(false)

  // Load remote templates
  useEffect(() => {
    if (open) {
      loadRemoteTemplates()
    }
  }, [open])

  const loadRemoteTemplates = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<{ templates: Template[] }>('/api/markdown/templates')
      const remoteTemplates = response.data.templates.map((t) => ({
        ...t,
        category: t.category || 'general'
      }))
      setTemplates([...localTemplates, ...remoteTemplates])
    } catch (error) {
      // Use local templates if API fails
      console.error('Failed to load remote templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documentation': return FileText
      case 'business': return Users
      case 'technical': return Code
      case 'academic': return Calculator
      default: return FileText
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a template to start with pre-formatted content
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-5 w-full">
            {categories.map(category => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category === 'all' ? 'All' : category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="flex-1 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 gap-4 pr-4">
                {filteredTemplates.map((template) => {
                  const Icon = template.icon || getCategoryIcon(template.category || 'general')
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        onSelect(template.content)
                        toast({
                          title: 'Template applied',
                          description: `"${template.name}" template has been loaded`
                        })
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          {template.category && (
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export the component wrapped with error boundary
export function TemplateSelector(props: TemplateSelectorProps) {
  return (
    <ErrorBoundary componentName="TemplateSelector">
      <TemplateSelectorBase {...props} />
    </ErrorBoundary>
  )
}