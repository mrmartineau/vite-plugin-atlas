import { useState } from 'react';
import type { AtlasExample } from 'vite-plugin-atlas/types';
import { SearchBar } from 'vite-plugin-atlas/components';

export const Default: AtlasExample = () => {
  const [value, setValue] = useState('');
  return <SearchBar value={value} onChange={setValue} />;
};
Default.description = 'An empty search bar ready for input.';

export const WithValue: AtlasExample = () => {
  const [value, setValue] = useState('Button');
  return <SearchBar value={value} onChange={setValue} />;
};
WithValue.description = 'A search bar pre-filled with a search term, showing the clear button.';
