import type { SVGProps } from 'react'

interface MermaidIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function MermaidIcon({ size = 24, className, ...props }: MermaidIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
    </svg>
  )
}
