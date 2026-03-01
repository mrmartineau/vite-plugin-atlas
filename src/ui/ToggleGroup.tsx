import { CaretDownIcon } from '@phosphor-icons/react'
import { type ReactNode, useCallback, useState } from 'react'

interface ToggleGroupProps {
  label: ReactNode
  count?: number
  defaultCollapsed?: boolean
  children: ReactNode
}

export function ToggleGroup({
  label,
  count,
  defaultCollapsed = false,
  children,
}: ToggleGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  return (
    <div className="atlas-group">
      <button type="button" className="atlas-group__header" onClick={toggle}>
        <span
          className={`atlas-group__toggle ${collapsed ? 'atlas-group__toggle--collapsed' : ''}`}
        >
          <CaretDownIcon size={12} />
        </span>
        <span className="atlas-group__name">{label}</span>
        {count != null && <span className="atlas-group__count">{count}</span>}
      </button>
      {!collapsed && children}
    </div>
  )
}
