import React from 'react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Eye,
  Code,
  Download,
  Save,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Strikethrough,
  Link,
  Image,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table,
  Hash,
  Braces,
  GitBranch,
  AlertCircle,
  Book,
  FileText,
  FileImage,
  SplitSquareHorizontal,
  Edit,
  ChevronDown,
  Type,
  Minus,
  Code2,
  Calculator,
  FlowChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownToolbarProps {
  viewMode: 'edit' | 'preview' | 'split'
  onViewModeChange: (mode: 'edit' | 'preview' | 'split') => void
  isFullscreen: boolean
  onFullscreenToggle: () => void
  onSave: () => void
  isSaving: boolean
  hasUnsavedChanges: boolean
  readOnly?: boolean
  onExportHTML: () => void
  onExportPDF: () => void
  toolbarActions: {
    bold: () => void
    italic: () => void
    strikethrough: () => void
    code: () => void
    codeBlock: () => void
    quote: () => void
    link: () => void
    image: () => void
    list: () => void
    orderedList: () => void
    task: () => void
    table: () => void
    heading1: () => void
    heading2: () => void
    heading3: () => void
    horizontalRule: () => void
    math: () => void
    diagram: () => void
    template: () => void
  }
  validationErrors: string[]
  onValidate: () => void
}

export function MarkdownToolbar({
  viewMode,
  onViewModeChange,
  isFullscreen,
  onFullscreenToggle,
  onSave,
  isSaving,
  hasUnsavedChanges,
  readOnly = false,
  onExportHTML,
  onExportPDF,
  toolbarActions,
  validationErrors,
  onValidate
}: MarkdownToolbarProps) {
  return (
    <TooltipProvider>
      <div className="border-b border-border bg-muted/30 px-2 py-1" role="toolbar" aria-label="Markdown editor toolbar">
        <div className="flex items-center justify-between">
          {/* Left side - Editing tools */}
          <div className="flex items-center gap-1">
            {/* View mode switcher */}
            <div className="flex items-center rounded-md border border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('edit')}
                    className="rounded-none rounded-l-md h-8 px-2"
                    disabled={readOnly}
                    aria-label="Edit mode"
                    aria-pressed={viewMode === 'edit'}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit mode</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('split')}
                    className="rounded-none h-8 px-2"
                    aria-label="Split view mode"
                    aria-pressed={viewMode === 'split'}
                  >
                    <SplitSquareHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Split view</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('preview')}
                    className="rounded-none rounded-r-md h-8 px-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview mode</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Text formatting */}
            {viewMode !== 'preview' && !readOnly && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.bold}
                      className="h-8 w-8 p-0"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.italic}
                      className="h-8 w-8 p-0"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.strikethrough}
                      className="h-8 w-8 p-0"
                    >
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Strikethrough</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.code}
                      className="h-8 w-8 p-0"
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Inline code</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6" />

                {/* Headings dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <Hash className="h-4 w-4 mr-1" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={toolbarActions.heading1}>
                      <Type className="h-4 w-4 mr-2" />
                      Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toolbarActions.heading2}>
                      <Type className="h-3.5 w-3.5 mr-2" />
                      Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toolbarActions.heading3}>
                      <Type className="h-3 w-3 mr-2" />
                      Heading 3
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toolbarActions.horizontalRule}>
                      <Minus className="h-4 w-4 mr-2" />
                      Horizontal rule
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Lists */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.list}
                      className="h-8 w-8 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bulleted list</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.orderedList}
                      className="h-8 w-8 p-0"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Numbered list</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.task}
                      className="h-8 w-8 p-0"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Task list</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6" />

                {/* Links and media */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.link}
                      className="h-8 w-8 p-0"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Link (Ctrl+K)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.image}
                      className="h-8 w-8 p-0"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Image</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.quote}
                      className="h-8 w-8 p-0"
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quote</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6" />

                {/* Advanced features */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.codeBlock}
                      className="h-8 w-8 p-0"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Code block</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.table}
                      className="h-8 w-8 p-0"
                    >
                      <Table className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Table</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.math}
                      className="h-8 w-8 p-0"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Math equation</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.diagram}
                      className="h-8 w-8 p-0"
                    >
                      <GitBranch className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Diagram (Mermaid)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toolbarActions.template}
                      className="h-8 w-8 p-0"
                    >
                      <Book className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Templates</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            {/* Validation */}
            {validationErrors.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onValidate}
                    className="h-8 px-2 text-orange-500"
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {validationErrors.length}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Validation issues:</p>
                    <ul className="text-xs space-y-1">
                      {validationErrors.slice(0, 3).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {validationErrors.length > 3 && (
                        <li>... and {validationErrors.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportHTML}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />

            {/* Save button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasUnsavedChanges ? 'default' : 'ghost'}
                  size="sm"
                  onClick={onSave}
                  disabled={readOnly || isSaving || !hasUnsavedChanges}
                  className="h-8 px-3"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (Ctrl+S)</TooltipContent>
            </Tooltip>

            {/* Fullscreen toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFullscreenToggle}
                  className="h-8 w-8 p-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}