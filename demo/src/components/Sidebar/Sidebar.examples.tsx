import { Sidebar } from 'vite-plugin-atlas/components'
import type { AtlasExample } from 'vite-plugin-atlas/types'

export const Default: AtlasExample = () => (
  <Sidebar
    items={[
      { id: 'section-1', label: 'Introduction' },
      { id: 'section-2', label: 'Usage' },
      { id: 'section-3', label: 'Props' },
      { id: 'section-4', label: 'Examples' },
    ]}
  />
)
Default.description = 'A sidebar navigation with section links that highlight on scroll.'
