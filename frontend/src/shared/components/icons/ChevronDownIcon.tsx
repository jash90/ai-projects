import type { SVGProps } from 'react'

interface ChevronDownIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function ChevronDownIcon({ size = 24, className, ...props }: ChevronDownIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}
