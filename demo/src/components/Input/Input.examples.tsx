import { useState } from 'react';
import { Input } from './Input';

export const Default = () => <Input label="Name" placeholder="Enter your name" />;

export const WithError = () => <Input label="Email" type="email" value="not-an-email" error="Please enter a valid email address" />;

export const Disabled = () => <Input label="Username" value="locked-user" disabled />;

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
