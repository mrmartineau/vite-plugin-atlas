# vite-plugin-atlas

A convention-driven component documentation plugin for Vite + React. Zero configuration. AI-agent friendly.

Atlas discovers `*.examples.tsx` files in your project, extracts props and source code, and serves a built-in documentation UI at `/_atlas` during development.

## Install

```bash
npm install vite-plugin-atlas --save-dev
bun add -d vite-plugin-atlas
pnpm add -D vite-plugin-atlas
yarn add -D vite-plugin-atlas
```

## Quick Start

**1. Add the plugin to your Vite config:**

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import atlas from 'vite-plugin-atlas'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), atlas()],
})
```

**2. Create an examples file next to any component:**

```tsx
// src/components/Button/Button.examples.tsx
import { Button } from './Button'

export const Primary = () => <Button variant="primary">Click me</Button>

export const Secondary = () => <Button variant="secondary">Cancel</Button>

export const Disabled = () => <Button disabled>Can't click</Button>
```

**3. Start your dev server and visit `/_atlas`.**

That's it. Atlas discovers the examples file, extracts the source code and props from `Button.tsx`, and renders a full documentation page.

## How It Works

Atlas scans for `*.examples.{tsx,jsx,ts,js}` files. Each named export is one example — a function that returns JSX.

```
src/
  components/
    Button/
      Button.tsx              ← the component
      Button.examples.tsx     ← required: makes Button appear in Atlas
      Button.md               ← optional: prose documentation
    Card/
      Card.tsx
      Card.examples.tsx
  patterns/
    FormLayout.examples.tsx   ← composition example (multiple components)
```

- The **filename** determines the component name: `Button.examples.tsx` → "Button"
- The **directory** determines the group: `components/forms/Input.examples.tsx` → group "forms"
- **Docs** are discovered automatically: `Button.mdx`, `Button.md`, `README.mdx`, or `README.md` in the same directory
- **Props** are extracted from TypeScript interfaces (gracefully skipped for JS files)

## Configuration

All options are optional:

```ts
atlas({
  pattern: '**/*.examples.{tsx,jsx,ts,js}', // glob or array of globs
  route: '/_atlas', // base route for the UI
  title: 'Atlas', // page title
  ignore: ['**/node_modules/**'], // globs to ignore
  wrapper: './src/providers/ThemeProvider.tsx', // global wrapper component (file path)
  styles: ['src/index.css', 'src/tailwind.css'], // CSS files to load in component previews
  importPrefix: '@/components', // prefix for import statements in docs
  importPackage: '@mrmartineau/react-components', // npm package name for imports
})
```

### Monorepo

```ts
atlas({
  pattern: [
    'packages/ui/src/**/*.examples.{tsx,jsx,ts,js}',
    'packages/forms/src/**/*.examples.{tsx,jsx,ts,js}',
  ],
})
```

### Import Package

If your component library is published to npm, use `importPackage` to show imports exactly as consumers would write them. It accepts a **string** or a **function** for full control over how each import path is rewritten. Bare specifiers (e.g. `lodash`, `clsx`) are always left untouched.

This applies everywhere imports are shown — the UI, the AI context endpoints, the CLI, and static exports.

**String — barrel exports:**

When your package re-exports everything from a single entry point:

```ts
atlas({
  importPackage: '@mrmartineau/react-components',
})
```

```tsx
// Before (in examples file)
import { Button } from '../Button'
import { Icon } from '../../Icon'

// After (displayed in Atlas)
import { Button } from '@mrmartineau/react-components'
import { Icon } from '@mrmartineau/react-components'
```

**Function — subpath exports:**

When your package uses subpath exports or you need per-import control, pass a function that receives the original import path and the examples file path:

```ts
import path from 'node:path'

atlas({
  importPackage: (importPath) =>
    `@mrmartineau/react-components/${path.basename(importPath)}`,
})
```

```tsx
// Before
import { Button } from '../Button'
import { Icon } from '../../icons/Icon'

// After
import { Button } from '@mrmartineau/react-components/Button'
import { Icon } from '@mrmartineau/react-components/Icon'
```

The function signature is `(importPath: string, examplesFile: string) => string`, where `importPath` is the raw specifier from the import statement (e.g. `'../Button'`) and `examplesFile` is the project-relative path to the examples file (e.g. `'src/components/Button/Button.examples.tsx'`).

> **Note:** `importPackage` takes priority over `importPrefix` when both are set.

### Global Wrapper

The `wrapper` option accepts a file path to a React component with a default export. Atlas dynamically imports it at render time to wrap all examples (e.g., with a theme provider).

```tsx
// src/providers/ThemeProvider.tsx
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MyThemeContext.Provider value={theme}>{children}</MyThemeContext.Provider>
  )
}
```

## Example Metadata

Attach optional metadata to examples using either approach:

**Type helper:**

```tsx
import type { AtlasExample } from 'vite-plugin-atlas'

export const Primary: AtlasExample = () => (
  <Button variant="primary">Click me</Button>
)
Primary.title = 'Primary Button'
Primary.description = 'The default button style for primary actions.'
```

**Utility function:**

```tsx
import { example } from 'vite-plugin-atlas'

export const Primary = example(
  () => <Button variant="primary">Click me</Button>,
  {
    title: 'Primary Button',
    description: 'The default button style for primary actions.',
  },
)
```

| Property      | Type       | Description                                   |
| ------------- | ---------- | --------------------------------------------- |
| `title`       | `string`   | Display name (defaults to export name)        |
| `description` | `string`   | Short description shown below the title       |
| `wrapper`     | `React.FC` | Per-example wrapper (e.g., a theme provider)  |
| `order`       | `number`   | Sort order (defaults to export order in file) |

## Documentation Files

**Markdown** (`.md`) — rendered above examples on the component page.

**MDX** (`.mdx`) — markdown with two special components:

```mdx
# Button

Use the primary button for the main action on a page.

<AtlasExample name="Primary" />

## Props

<AtlasProps />
```

## AI Agent Interface

Atlas is designed for AI agent consumption. Every piece of information in the UI is also available in machine-readable formats.

### API Endpoints

| Endpoint                               | Description                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /_atlas/api/manifest.json`        | Full component catalogue                                                     |
| `GET /_atlas/api/component/:slug.json` | Complete component details (props, examples, docs)                           |
| `GET /_atlas/api/component/:slug.md`   | Markdown context file for LLM consumption                                    |
| `GET /_atlas/api/all.json`             | All components in one request (supports `?components=button,card` filtering) |

### UI Buttons

Each component page includes:

- **Download for AI** — downloads a `.atlas.md` file optimized for LLM context
- **Copy Full Context** — copies the same content to clipboard for pasting into an AI chat

### Agent Skill Document

Atlas ships `ATLAS_SKILL.md` — a portable spec file that teaches any AI coding tool to produce Atlas-compatible files on the first try. Drop it into your agent's context.

## CLI

```bash
# List all discovered components
npx atlas list

# Output component context for AI consumption
npx atlas context Button
npx atlas context Button Card Input

# Validate an examples file
npx atlas validate src/components/Button/Button.examples.tsx

# Export static API files
npx atlas export
npx atlas export --outdir docs/atlas
```

The CLI resolves your `vite.config.ts` automatically, so it always uses the same configuration as the plugin.

## Static Export

`npx atlas export` outputs a static directory with all API endpoints as files:

```
atlas-static/
  api/
    manifest.json
    all.json
    component/
      button.json
      button.md
      card.json
      card.md
```

## License

MIT
