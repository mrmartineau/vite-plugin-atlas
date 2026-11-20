import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Button } from '../Button/Button'
import { Card } from './Card'

export const Basic: AtlasExample = () => (
  <Card title="Getting Started" description="Learn the basics of our platform." />
)
Basic.description = 'A minimal card with just a title and description.'

export const WithContent: AtlasExample = () => (
  <Card title="Team Members" description="Manage your team.">
    <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.875rem' }}>
      <li>Alice — Admin</li>
      <li>Bob — Editor</li>
      <li>Charlie — Viewer</li>
    </ul>
  </Card>
)
WithContent.description = 'Cards can render any content in their body, such as lists or forms.'

export const WithFooter: AtlasExample = () => (
  <Card
    title="Upgrade Plan"
    description="You're on the free tier. Upgrade to unlock more features."
    footer={
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="primary" size="sm">
          Upgrade
        </Button>
        <Button variant="secondary" size="sm">
          Learn More
        </Button>
      </div>
    }
  />
)
WithFooter.description = 'The footer slot is ideal for action buttons or metadata.'
