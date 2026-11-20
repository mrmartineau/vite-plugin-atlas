import { CopyButton } from 'vite-plugin-atlas/components'
import type { AtlasExample } from 'vite-plugin-atlas/types'

export const Default: AtlasExample = () => <CopyButton text="Hello, world!" />
Default.description = 'Icon-only copy button with default styling.'

export const WithLabel: AtlasExample = () => (
  <CopyButton text="npm install vite-plugin-atlas">Copy command</CopyButton>
)
WithLabel.description = 'Copy button with a visible text label.'

export const CustomClass: AtlasExample = () => (
  <CopyButton text="Custom styled" className="atlas-btn">
    Copy
  </CopyButton>
)
CustomClass.description = 'Copy button with a custom CSS class applied.'
