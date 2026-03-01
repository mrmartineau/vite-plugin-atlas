import type { AtlasExample } from 'vite-plugin-atlas/types';
import { PropsTable } from 'vite-plugin-atlas/components';

export const Default: AtlasExample = () => (
  <PropsTable
    props={[
      { name: 'variant', type: "'primary' | 'secondary'", required: false, default: "'primary'", description: 'The visual style of the component' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", required: false, default: "'md'", description: 'Controls the size' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Whether the component is disabled' },
      { name: 'children', type: 'ReactNode', required: true, default: undefined, description: 'The content to render' },
      { name: 'onClick', type: '() => void', required: false, default: undefined, description: 'Click handler' },
    ]}
  />
);
Default.description = 'A props table displaying component API documentation.';

export const Minimal: AtlasExample = () => (
  <PropsTable
    props={[
      { name: 'label', type: 'string', required: true, default: undefined, description: '' },
    ]}
  />
);
Minimal.description = 'A props table with a single required prop and no description.';
