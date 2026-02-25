export interface InputProps {
  /** Input label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number';
  /** Current value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
}

export function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  disabled = false,
  error,
}: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        style={{
          padding: '8px 12px',
          border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
          borderRadius: '6px',
          fontSize: '0.875rem',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />
      {error && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}
