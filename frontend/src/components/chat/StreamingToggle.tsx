import React from 'react'
import { Zap, ZapOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface StreamingToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  className?: string
}

export function StreamingToggle({ enabled, onToggle, className }: StreamingToggleProps) {
  return (
    <Button
      variant={enabled ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!enabled)}
      className={cn("flex items-center gap-2", className)}
      title={enabled ? "Disable streaming responses" : "Enable streaming responses"}
    >
      {enabled ? (
        <>
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">Streaming</span>
        </>
      ) : (
        <>
          <ZapOff className="w-4 h-4" />
          <span className="hidden sm:inline">Regular</span>
        </>
      )}
    </Button>
  )
}
