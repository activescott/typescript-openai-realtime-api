import { ReactNode } from "react"
import svgPath from "bootstrap-icons/bootstrap-icons.svg"

export function BootstrapIcon({
  name,
  size,
}: {
  name: string
  size?: 16 | 24 | 32 | 48
}): ReactNode {
  size = size || 16
  return (
    <svg className="bi" width={size} height={size} fill="currentColor">
      <use xlinkHref={`${svgPath}#${name}`} />
    </svg>
  )
}
