import { useState } from 'react';
import type { AtlasExample } from 'vite-plugin-atlas/types';
import { Input } from './Input';

export const Default: AtlasExample = () => <Input label="Name" placeholder="Enter your name" />;
Default.description = 'A basic text input with a label and placeholder.';

export const WithError: AtlasExample = () => <Input label="Email" type="email" value="not-an-email" error="Please enter a valid email address" />;
WithError.description = 'Inputs display an inline error message when validation fails.';

export const Disabled: AtlasExample = () => <Input label="Username" value="locked-user" disabled />;
Disabled.description = 'Disabled inputs are visually dimmed and prevent interaction.';

export const Controlled = () => {
  const [value, setValue] = useState('');
  return (
    <div>
      <Input label="Search" placeholder="Type something..." value={value} onChange={setValue} />
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
        You typed: {value || '(nothing)'}
      </p>
    </div>
  );
};
Controlled.title = 'Controlled Input';
Controlled.description = 'An input with controlled state showing the current value.';
