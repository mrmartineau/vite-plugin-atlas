import { useState } from 'react';
import type { AtlasExample } from 'vite-plugin-atlas/types';
import { Button } from './Button';

export const Primary: AtlasExample = () => <Button variant="primary">Save Changes</Button>;
Primary.description = 'The default button for primary actions.';

export const Secondary: AtlasExample = () => <Button variant="secondary">Cancel</Button>;
Secondary.description = 'Used for secondary or dismissive actions.';

export const Danger: AtlasExample = () => <Button variant="danger">Delete Account</Button>;
Danger.description = 'For destructive actions that require attention.';

export const Sizes = () => (
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const Disabled = () => <Button disabled>Can't click me</Button>;

export const WithState = () => {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</Button>;
};
WithState.title = 'Interactive';
WithState.description = 'A button with click counter state.';
