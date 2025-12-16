import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileCreate } from '@/types'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface FileDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FileCreate) => Promise<void>
  title: string
}

const FILE_TYPES = [
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'cpp', label: 'C++', extension: 'cpp' },
  { value: 'html', label: 'HTML', extension: 'html' },
  { value: 'css', label: 'CSS', extension: 'css' },
  { value: 'json', label: 'JSON', extension: 'json' },
  { value: 'markdown', label: 'Markdown', extension: 'md' },
  { value: 'text', label: 'Plain Text', extension: 'txt' },
  { value: 'yaml', label: 'YAML', extension: 'yml' },
  { value: 'xml', label: 'XML', extension: 'xml' },
  { value: 'sql', label: 'SQL', extension: 'sql' },
  { value: 'shell', label: 'Shell Script', extension: 'sh' },
  { value: 'dockerfile', label: 'Dockerfile', extension: '' },
  { value: 'other', label: 'Other', extension: '' },
]

const FILE_TEMPLATES: Record<string, string> = {
  javascript: `// JavaScript file
console.log('Hello, World!');
`,
  typescript: `// TypeScript file
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: '1',
  name: 'John Doe'
};

console.log(user);
`,
  python: `# Python file
def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
`,
  java: `// Java file
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  cpp: `// C++ file
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
`,
  css: `/* CSS file */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

h1 {
    color: #333;
    text-align: center;
}
`,
  json: `{
  "name": "example",
  "version": "1.0.0",
  "description": "An example JSON file"
}
`,
  markdown: `# Markdown File

This is a **markdown** file with some example content.

## Features

- Lists
- **Bold text**
- *Italic text*
- \`Code\`

## Code Block

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`,
  yaml: `# YAML file
name: example
version: 1.0.0
description: An example YAML file

dependencies:
  - package1
  - package2

config:
  debug: true
  port: 3000
`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <item id="1">
        <name>Example</name>
        <description>An example XML file</description>
    </item>
</root>
`,
  sql: `-- SQL file
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email) VALUES 
('John Doe', 'john@example.com'),
('Jane Smith', 'jane@example.com');
`,
  shell: `#!/bin/bash
# Shell script

echo "Hello, World!"

# Variables
NAME="World"
echo "Hello, $NAME!"
`,
  dockerfile: `# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "start"]
`,
}

export function FileDialog({ open, onClose, onSubmit, title }: FileDialogProps) {
  const { t } = useTranslation('files')
  const [formData, setFormData] = useState({
    name: '',
    type: 'text',
    content: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = (type: string) => {
    const selectedType = FILE_TYPES.find(t => t.value === type)
    const template = FILE_TEMPLATES[type] || ''
    
    // Auto-generate filename with extension if name is empty or just has old extension
    let newName = formData.name
    if (!newName || newName.includes('.')) {
      const baseName = newName.split('.')[0] || 'untitled'
      newName = selectedType?.extension 
        ? `${baseName}.${selectedType.extension}`
        : baseName
    }

    setFormData(prev => ({
      ...prev,
      type,
      name: newName,
      content: template
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (!formData.name.trim()) {
      setError(t('dialog.fileNameRequired'))
      return
    }

    if (!formData.type) {
      setError(t('dialog.fileTypeRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: formData.name.trim(),
        content: formData.content,
        type: formData.type,
      })
      
      // Reset form
      setFormData({
        name: '',
        type: 'text',
        content: '',
      })
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'text',
      content: '',
    })
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('dialog.fileName')} *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('dialog.fileNamePlaceholder')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="type">{t('dialog.fileType')} *</Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.label}</span>
                          {type.extension && (
                            <span className="text-xs text-muted-foreground">
                              .{type.extension}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="content">{t('dialog.content')}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t('dialog.contentPlaceholder')}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('dialog.contentHint')}
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                {t('dialog.creating')}
              </>
            ) : (
              t('dialog.create')
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
