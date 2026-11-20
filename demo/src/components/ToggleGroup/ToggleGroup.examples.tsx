import { ToggleGroup } from 'vite-plugin-atlas/components'
import type { AtlasExample } from 'vite-plugin-atlas/types'

export const Expanded: AtlasExample = () => (
  <ToggleGroup label="Section Title" count={3}>
    <div style={{ padding: '8px 16px' }}>
      <p>Content inside the toggle group.</p>
    </div>
  </ToggleGroup>
)
Expanded.description = 'A toggle group that starts expanded by default.'

export const Collapsed: AtlasExample = () => (
  <ToggleGroup label="Collapsed Section" count={5} defaultCollapsed>
    <div style={{ padding: '8px 16px' }}>
      <p>This content is hidden until the group is toggled open.</p>
    </div>
  </ToggleGroup>
)
Collapsed.description = 'A toggle group that starts in a collapsed state.'

export const WithoutCount: AtlasExample = () => (
  <ToggleGroup label="No Count">
    <div style={{ padding: '8px 16px' }}>
      <p>A toggle group without a count badge.</p>
    </div>
  </ToggleGroup>
)
WithoutCount.description = 'Toggle group without the optional count indicator.'
