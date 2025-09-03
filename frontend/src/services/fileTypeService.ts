import { File as FileType } from '@/types'

export class FileTypeService {
  /**
   * Detect if a file should be treated as Markdown
   */
  static isMarkdownFile(file: FileType): boolean {
    // Check by extension
    if (file.name.toLowerCase().endsWith('.md') || 
        file.name.toLowerCase().endsWith('.markdown')) {
      return true
    }
    
    // Check by type
    if (file.type === 'markdown') {
      return true
    }
    
    // Check by content (for uploaded files)
    if (this.hasMarkdownContent(file.content)) {
      return true
    }
    
    return false
  }
  
  /**
   * Detect Markdown content in file
   */
  private static hasMarkdownContent(content: string): boolean {
    if (!content || content.length < 10) return false
    
    const markdownIndicators = [
      /^#{1,6}\s+/m,           // Headers at start of line
      /\*\*.*?\*\*/,           // Bold text
      /\*[^*]+\*/,             // Italic text
      /`[^`]+`/,               // Inline code
      /```[\s\S]*?```/,        // Code blocks
      /^\s*[-*+]\s+/m,         // List items
      /^\s*\d+\.\s+/m,         // Numbered lists
      /\[[^\]]+\]\([^)]+\)/,   // Links
      /\$\$[\s\S]*?\$\$/,      // Math blocks
      /\$.*?\$/,               // Inline math
      /\|.*\|/,                // Tables
    ]
    
    const indicatorCount = markdownIndicators.reduce((count, pattern) => {
      return count + (pattern.test(content) ? 1 : 0)
    }, 0)
    
    // If 2 or more Markdown indicators are present, likely Markdown
    return indicatorCount >= 2
  }
  
  /**
   * Determine if a file should use the Markdown editor
   */
  static shouldUseMarkdownEditor(file: FileType): boolean {
    return file.type === 'markdown' || this.isMarkdownFile(file)
  }

  /**
   * Get files that are candidates for migration to Markdown type
   */
  static getMigrationCandidates(files: FileType[]): FileType[] {
    return files.filter(file => 
      this.isMarkdownFile(file) && file.type !== 'markdown'
    )
  }

  /**
   * Migrate file to Markdown type
   */
  static async migrateToMarkdown(fileId: string): Promise<void> {
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    const token = localStorage.getItem('token')

    const response = await fetch(`${apiUrl}/files/${fileId}/migrate-markdown`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to migrate file to Markdown')
    }
  }
}
