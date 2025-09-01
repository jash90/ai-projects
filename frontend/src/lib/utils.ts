import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(dateObj)) {
    return format(dateObj, 'HH:mm')
  } else if (isYesterday(dateObj)) {
    return 'Yesterday'
  } else {
    return format(dateObj, 'MMM d, yyyy')
  }
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function generateColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 60%)`
}

export function isImageFile(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}

export function isTextFile(mimetype: string): boolean {
  return mimetype.startsWith('text/') || 
         mimetype === 'application/json' ||
         mimetype === 'application/javascript' ||
         mimetype === 'application/typescript'
}

export function isPdfFile(mimetype: string): boolean {
  return mimetype === 'application/pdf'
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function getFileIcon(mimetype: string): string {
  if (isImageFile(mimetype)) return '🖼️'
  if (isPdfFile(mimetype)) return '📄'
  if (isTextFile(mimetype)) return '📝'
  if (mimetype.startsWith('video/')) return '🎥'
  if (mimetype.startsWith('audio/')) return '🎵'
  return '📎'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'absolute'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        textArea.remove()
        resolve()
      } catch (error) {
        textArea.remove()
        reject(error)
      }
    })
  }
}

export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function parseError(error: any): string {
  if (typeof error === 'string') return error
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = window.document.documentElement
  
  if (theme === 'system') {
    const systemTheme = getSystemTheme()
    root.classList.remove('light', 'dark')
    root.classList.add(systemTheme)
  } else {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
}

export function scrollToBottom(element: HTMLElement): void {
  element.scrollTop = element.scrollHeight
}

export function scrollIntoView(element: HTMLElement, options?: ScrollIntoViewOptions): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    ...options
  })
}