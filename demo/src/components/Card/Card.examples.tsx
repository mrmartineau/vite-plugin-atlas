import { Button } from '../Button/Button';
import { Card } from './Card';

export const Basic = () => <Card title="Getting Started" description="Learn the basics of our platform." />;

export const WithContent = () => (
  <Card title="Team Members" description="Manage your team.">
    <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '0.875rem' }}>
      <li>Alice — Admin</li>
      <li>Bob — Editor</li>
      <li>Charlie — Viewer</li>
    </ul>
  </Card>
);

export const WithFooter = () => (
  <Card
    title="Upgrade Plan"
    description="You're on the free tier. Upgrade to unlock more features."
    footer={
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="primary" size="sm">Upgrade</Button>
        <Button variant="secondary" size="sm">Learn More</Button>
      </div>
    }
  />
);
