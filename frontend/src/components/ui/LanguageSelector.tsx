import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'pl', flag: '🇵🇱', name: 'Polski' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'cs', flag: '🇨🇿', name: 'Čeština' },
  { code: 'ro', flag: '🇷🇴', name: 'Română' },
  { code: 'hu', flag: '🇭🇺', name: 'Magyar' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'da', flag: '🇩🇰', name: 'Dansk' },
  { code: 'fi', flag: '🇫🇮', name: 'Suomi' },
  { code: 'no', flag: '🇳🇴', name: 'Norsk' },
  { code: 'sk', flag: '🇸🇰', name: 'Slovenčina' },
  { code: 'bg', flag: '🇧🇬', name: 'Български' },
  { code: 'hr', flag: '🇭🇷', name: 'Hrvatski' },
  { code: 'el', flag: '🇬🇷', name: 'Ελληνικά' },
] as const

interface LanguageSelectorProps {
  variant?: 'grid' | 'dropdown'
  className?: string
}

export function LanguageSelector({ variant = 'grid', className }: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[1]

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 border rounded-xl transition-all duration-200',
              i18n.language === lang.code
                ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-xs font-medium truncate w-full text-center">{lang.name}</span>
            {i18n.language === lang.code && (
              <Check className="w-3 h-3 text-primary" />
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors w-full"
      >
        <Globe className="w-4 h-4" />
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="flex-1 text-left">{currentLanguage.name}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors w-full',
                i18n.language === lang.code && 'bg-primary/5 text-primary'
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
              {i18n.language === lang.code && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { LANGUAGES }
