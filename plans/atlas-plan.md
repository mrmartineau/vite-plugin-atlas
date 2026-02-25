# Atlas — Project Plan

## A convention-driven component documentation plugin for Vite + React

---

## 1. Vision

Atlas is a Vite plugin that discovers, renders, and documents React components with zero configuration. It is opinionated, convention-based, and designed to stay out of the way.

Atlas is the **display layer**. It does not generate documentation — it renders what exists. An accompanying **agent skill document** (`ATLAS_SKILL.md`) serves as a portable specification that any AI coding tool can consume to produce Atlas-compatible files on the first try.

### What Atlas Is

- A single Vite plugin added to `vite.config.ts`
- A convention-driven file discovery system
- A built-in documentation UI served at a configurable route
- A deterministic props extractor (from TypeScript interfaces, gracefully degraded for JS)
- A source code extractor for copyable usage snippets
- An AI-agent-friendly tool with machine-readable API endpoints, downloadable context files, and CLI commands designed for agent consumption
- A portable agent skill document that teaches any AI coding tool to produce Atlas-compatible files
- An open-source package published to npm

### What Atlas Is Not

- Not a design system framework
- Not an addon/extension platform
- Not a testing tool
- Not an AI-powered documentation generator (it helps agents, but doesn't run one)
- Not a separate dev server or build process

---

## 2. Core Conventions

### 2.1 File Discovery

Atlas discovers components by scanning for `*.examples.{tsx,jsx,ts,js}` files. The relationship between files is always based on co-location:

```
src/
  components/
    Button/
      Button.tsx              ← the component
      Button.examples.tsx     ← required: component examples
      Button.md               ← optional: prose documentation
      README.md               ← optional: alternative docs location
    Card/
      Card.tsx
      Card.examples.tsx
      Card.mdx                ← optional: MDX docs with embedded examples
  patterns/
    FormLayout.examples.tsx   ← composition example (multiple components)
```

**Rules:**

- A `*.examples.{tsx,jsx,ts,js}` file is the only requirement for a component to appear in Atlas
- The component name is derived from the examples filename: `Button.examples.tsx` → "Button"
- Grouping is derived from the directory structure: `components/forms/Input.examples.tsx` → group "forms"
- Composition examples live in a `patterns/` directory (or any directory) and appear as their own group
- Docs are discovered by looking for (in order): `ComponentName.mdx`, `ComponentName.md`, `README.mdx`, `README.md` in the same directory
- If no docs file exists, Atlas auto-generates a page from the examples + extracted props

### 2.2 Slug Generation

Slugs are derived from the full path relative to the project root, not just the filename. This prevents collisions in monorepos and large projects.

**Algorithm:**

1. Take the examples file path relative to the project root
2. Remove the glob root prefix (e.g., `src/components/`)
3. Remove the `.examples.{tsx,jsx,ts,js}` suffix
4. Convert path separators to hyphens
5. Lowercase

**Examples:**

```
src/components/Button/Button.examples.tsx        → "button"
src/components/forms/Input/Input.examples.tsx     → "forms-input"
packages/ui/src/Button/Button.examples.tsx        → "ui-button"
packages/forms/src/Button/Button.examples.tsx     → "forms-button"
src/patterns/FormLayout.examples.tsx              → "patterns-formlayout"
```

Atlas detects slug collisions at startup and throws a clear error with both file paths, asking the user to rename one.

### 2.3 Examples File Format

Each named export from an examples file is one variant. Each export is a function that returns JSX.

```tsx
// Button.examples.tsx
import { Button } from './Button'
import { Star } from 'lucide-react'

export const Primary = () => <Button variant="primary">Click me</Button>

export const Secondary = () => (
  <Button variant="secondary">Secondary action</Button>
)

export const WithIcon = () => (
  <Button variant="primary" icon={<Star />}>
    Starred
  </Button>
)

export const Disabled = () => <Button disabled>Can't click</Button>

export const FullExample = () => {
  const [count, setCount] = useState(0)
  return (
    <Button onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times
    </Button>
  )
}
```

**Composition examples** work identically — they just import multiple components:

```tsx
// patterns/FormLayout.examples.tsx
import { Form } from '../components/Form/Form'
import { Input } from '../components/Input/Input'
import { Button } from '../components/Button/Button'

export const BasicForm = () => (
  <Form onSubmit={console.log}>
    <Input label="Name" placeholder="Enter your name" />
    <Input label="Email" type="email" placeholder="Enter your email" />
    <Button type="submit">Submit</Button>
  </Form>
)
BasicForm.title = 'Basic Form'
BasicForm.description =
  'A simple contact form showing Form, Input, and Button working together.'
```

### 2.4 Example Metadata

Optional metadata is attached as properties on the export. Atlas ships type helpers to avoid TypeScript errors.

**Option A: Type helper (minimal, no runtime overhead)**

```tsx
import type { AtlasExample } from 'vite-plugin-atlas'

export const Primary: AtlasExample = () => (
  <Button variant="primary">Click me</Button>
)
Primary.title = 'Primary Button'
Primary.description = 'The default button style used for primary actions.'
```

**Option B: Utility function (more ergonomic, better IDE autocomplete)**

```tsx
import { example } from 'vite-plugin-atlas'

export const Primary = example(
  () => <Button variant="primary">Click me</Button>,
  {
    title: 'Primary Button',
    description: 'The default button style used for primary actions.',
  },
)
```

Both approaches are supported. The `example()` utility is a zero-overhead wrapper that simply attaches the metadata properties — it does not wrap the component in a HOC or add runtime behavior.

**Available metadata properties:**

| Property      | Type       | Description                                           |
| ------------- | ---------- | ----------------------------------------------------- |
| `title`       | `string`   | Display name (defaults to export name, de-camelCased) |
| `description` | `string`   | Short description shown below the title               |
| `wrapper`     | `React.FC` | Optional wrapper component (e.g., a theme provider)   |
| `order`       | `number`   | Sort order (defaults to export order in file)         |

No other metadata properties exist. This is the complete set.

### 2.5 Docs File Format

**Markdown (`.md`):**

Standard markdown. Atlas renders it above the examples on the component page.

**MDX (`.mdx`):**

MDX with two special components available:

```mdx
# Button

Our button component supports multiple variants for different action levels.

## Primary Actions

Use the primary button for the main action on a page.

<AtlasExample name="Primary" />

## Disabled State

Buttons can be disabled to prevent interaction:

<AtlasExample name="Disabled" />

## Props

<AtlasProps />
```

`<AtlasExample name="..." />` renders the named example inline with its source code.
`<AtlasProps />` renders the auto-extracted props table.

If no MDX/MD file exists, Atlas generates a default page that renders all examples in order with their source code and the props table at the top.

---

## 3. Plugin Architecture

### 3.1 Plugin Configuration

```ts
// vite.config.ts
import react from '@vitejs/plugin-react'
import atlas from 'vite-plugin-atlas'

export default defineConfig({
  plugins: [
    react(),
    atlas({
      // All optional — these are the defaults
      pattern: '**/*.examples.{tsx,jsx,ts,js}', // glob or array of globs
      route: '/_atlas', // base route for the UI
      title: 'Atlas', // page title
      ignore: ['**/node_modules/**'], // globs to ignore
      wrapper: './src/providers/ThemeProvider.tsx', // path to global wrapper (default export)
      importPrefix: '@/components', // prefix for import statements in docs
    }),
  ],
})
```

**Global wrapper note:** The `wrapper` option accepts a **file path string**, not a component reference. This is because `vite.config.ts` runs in Node.js at config time where React components cannot be imported. Atlas dynamically imports the wrapper module at render time in the browser. The wrapper file must have a default export that is a React component accepting `{ children }`.

**Import prefix note:** The `importPrefix` option controls how import statements appear in the Atlas UI, API endpoints, and downloaded context files. If set to `@my-ui-lib`, a component at `src/components/Button/Button.tsx` will show `import { Button } from '@my-ui-lib/Button'`. If not set, Atlas reads Vite's `resolve.alias` config. If neither is available, Atlas falls back to relative paths from the project root.

**Monorepo example:**

```ts
atlas({
  pattern: [
    'packages/ui/src/**/*.examples.{tsx,jsx,ts,js}',
    'packages/forms/src/**/*.examples.{tsx,jsx,ts,js}',
    'apps/web/src/components/**/*.examples.{tsx,jsx,ts,js}',
  ],
})
```

**Published package example:**

```ts
// For a public npm package like @acme/ui
atlas({
  importPrefix: '@acme/ui', // docs will show: import { Button } from '@acme/ui/Button'
})
```

Seven options. All optional. That is the complete configuration surface.

### 3.2 Virtual Modules

Atlas creates three virtual modules that power the UI:

**`virtual:atlas-manifest`**

```ts
export const manifest = [
  {
    slug: 'button',
    name: 'Button',
    group: 'components',
    path: '/src/components/Button',
    examplesModule: '/src/components/Button/Button.examples.tsx',
    docsFile: '/src/components/Button/Button.md', // or null
    exports: ['Primary', 'Secondary', 'WithIcon', 'Disabled', 'FullExample'],
  },
  {
    slug: 'patterns-formlayout',
    name: 'FormLayout',
    group: 'patterns',
    path: '/src/patterns',
    examplesModule: '/src/patterns/FormLayout.examples.tsx',
    docsFile: null,
    exports: ['BasicForm', 'WithValidation'],
  },
  // ...
]
```

**`virtual:atlas-source/{slug}`**

```ts
// virtual:atlas-source/button
export const sources = {
  Primary: `<Button variant="primary">Click me</Button>`,
  Secondary: `<Button variant="secondary">Secondary action</Button>`,
  // ...
}

export const imports = `import { Button } from '@acme/ui/Button';\nimport { Star } from 'lucide-react';`
```

Note: The imports are transformed to use the configured `importPrefix` or resolved aliases. The raw relative imports from the examples file are rewritten to show the canonical import path that consumers of the component would use.

**`virtual:atlas-props/{slug}`**

```ts
// virtual:atlas-props/button
export const props = [
  {
    name: 'variant',
    type: "'primary' | 'secondary'",
    required: false,
    default: "'primary'",
    description: 'The visual style of the button',
  },
  {
    name: 'disabled',
    type: 'boolean',
    required: false,
    default: 'false',
    description: 'Whether the button is disabled',
  },
  {
    name: 'icon',
    type: 'ReactNode',
    required: false,
    default: 'undefined',
    description: 'Icon element to display before the label',
  },
  {
    name: 'onClick',
    type: '() => void',
    required: false,
    default: 'undefined',
    description: 'Click handler',
  },
  {
    name: 'children',
    type: 'ReactNode',
    required: true,
    default: undefined,
    description: 'Button content',
  },
]
```

For JavaScript files without type annotations, the props virtual module exports an empty array. The props table is simply omitted from the UI.

### 3.3 Plugin Internals

The Vite plugin does five things:

1. **Discovery** — On dev server start, glob for example files (supports multiple globs for monorepos, supports `.tsx`, `.jsx`, `.ts`, `.js` extensions). Build the manifest. Detect slug collisions and throw a clear error. Watch for file additions/removals and update the manifest via HMR.

2. **Source extraction** — At transform time, read each examples file as raw text. Use the TypeScript compiler API to parse the AST and extract each export's function body as a source string (see Section 5 for details). Serve via virtual module.

3. **Props extraction** — Use the TypeScript compiler API to find the component's props type/interface by following the imports in the examples file (see Section 7 for details). For `.js`/`.jsx` files, skip props extraction gracefully. Serve via virtual module.

4. **Route serving** — Intercept requests to `/_atlas/*` and serve the Atlas UI app (a small bundled React application). Dynamically import and apply the global wrapper component if configured.

5. **API endpoints** — Serve machine-readable JSON and markdown endpoints at `/_atlas/api/*` for AI agent consumption (see Section 6).

### 3.4 MDX Processing

Atlas uses `@mdx-js/rollup` internally to transform `.mdx` files associated with components. The MDX transform is only applied to files that Atlas has identified as component docs — it does not affect other MDX files in the project.

### 3.5 CSS and Style Dependencies

Atlas runs inside the Vite dev server. Component CSS imports (CSS files, CSS modules, CSS-in-JS) are handled by Vite's existing CSS pipeline. This is a deliberate reason Atlas is a Vite plugin rather than a standalone tool — it inherits the project's complete build and style resolution for free.

---

## 4. The Atlas UI

### 4.1 Index Page (`/_atlas`)

The index page is a single-page listing of all discovered components.

**Layout:**

```
┌──────────────────────────────────────────────┐
│  Atlas — [Project Title]          [Search]   │
├──────────────────────────────────────────────┤
│                                              │
│  components                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ [preview]│ │ [preview]│ │ [preview]│     │
│  │  Button  │ │   Card   │ │  Input   │     │
│  │ 5 examples│ │ 3 examples│ │ 4 examples│   │
│  └──────────┘ └──────────┘ └──────────┘     │
│                                              │
│  patterns                                    │
│  ┌──────────┐ ┌──────────┐                   │
│  │ [preview]│ │ [preview]│                   │
│  │FormLayout│ │ DataTable│                   │
│  │ 2 examples│ │ 3 examples│                  │
│  └──────────┘ └──────────┘                   │
│                                              │
│  layout                                      │
│  ┌──────────┐ ┌──────────┐                   │
│  │ [preview]│ │ [preview]│                   │
│  │  Sidebar │ │   Grid   │                   │
│  │ 2 examples│ │ 3 examples│                  │
│  └──────────┘ └──────────┘                   │
│                                              │
└──────────────────────────────────────────────┘
```

**Features:**

- Components grouped by directory path (patterns, components, layout, etc.)
- Each card shows a live render of the first example as a thumbnail
- Thumbnails are lazy-rendered using `IntersectionObserver` — only mounted when scrolled into view
- Search/filter by component name
- Click to navigate to component page
- Groups are collapsible

### 4.2 Component Page (`/_atlas/:slug`)

The deep-linkable component documentation page.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Atlas               Button                       │
├──────────────────────────────────────────────────┬───────────┤
│                                                  │ MINIMAP   │
│  import { Button } from '@acme/ui/Button'        │           │
│                                           [copy] │ • Props   │
│                                                  │ • Docs    │
│  [⬇ Download for AI]   [📋 Copy Full Context]    │ ────────  │
│                                                  │ • Primary │
│  Props                                           │ • Second. │
│  ┌──────────────────────────────────────┐        │ • WithIcon│
│  │ Name     │ Type         │ Default    │        │ • Disabled│
│  │ variant  │ 'primary'|.. │ 'primary'  │        │ • Full Ex.│
│  │ disabled │ boolean      │ false      │        │           │
│  │ ...      │              │            │        │           │
│  └──────────────────────────────────────┘        │           │
│                                                  │           │
│  [Rendered markdown/mdx docs content here]       │           │
│                                                  │           │
│  ─── Examples ────────────────────────────       │           │
│                                                  │           │
│  Primary Button                                  │           │
│  The default button style.                       │           │
│  ┌──────────────────────────────────────┐        │           │
│  │       [ Click me ]                   │        │           │
│  └──────────────────────────────────────┘        │           │
│  ┌──────────────────────────────────────┐        │           │
│  │ <Button variant="primary">      [copy]│       │           │
│  │   Click me                            │       │           │
│  │ </Button>                             │       │           │
│  └──────────────────────────────────────┘        │           │
│                                                  │           │
└──────────────────────────────────────────────────┴───────────┘
```

**Features:**

- Back link to index
- Auto-generated import statement with copy button (uses `importPrefix` or resolved aliases)
- **"Download for AI" button** — downloads `ComponentName.atlas.md`, a structured markdown file containing the complete component specification (import path, props table, all example source, docs prose) optimized for LLM consumption
- **"Copy Full Context" button** — copies the same content to clipboard for pasting into an AI chat
- Props table (auto-extracted from TypeScript; omitted for JS files)
- Rendered docs prose (if md/mdx file exists)
- Each example rendered in a card with:
  - Live preview (wrapped in global wrapper, then per-example wrapper if specified)
  - Syntax-highlighted source code
  - Copy button for source code
  - Title and description (from metadata)
- Deep-linkable anchors for each example (`/_atlas/button#primary`)
- **Sticky sidebar** on the left with anchor links to: Props, Docs, and each example by name
- **Minimap** on the right showing a visual overview of the page with scroll position indicator

### 4.3 UI Technology Choices

| Concern              | Choice                                | Rationale                                     |
| -------------------- | ------------------------------------- | --------------------------------------------- |
| Styling              | Embedded CSS (no Tailwind dependency) | Zero assumptions about the host project       |
| Syntax highlighting  | Shiki (bundled)                       | Vite-native, fast, beautiful output           |
| Routing              | Simple hash-based or pathname routing | No dependency on react-router                 |
| Code copy            | `navigator.clipboard`                 | No library needed                             |
| Layout               | CSS Grid + minimal responsive design  | Works on any screen                           |
| Preview lazy loading | `IntersectionObserver`                | Prevents 50+ component trees mounting at once |

The Atlas UI is self-contained. It does not import from or depend on the host project's styles, router, or state management. It renders in an isolated root.

---

## 5. Source Code Extraction — Detail

This is the most important technical piece. The displayed source must always match what's actually rendered.

### 5.1 Extraction Strategy

Atlas uses the **TypeScript compiler API** (not regex) for source extraction. The compiler API handles JSX, nested templates, string interpolation, and multi-line expressions correctly.

At transform time, when Atlas encounters a `*.examples.{tsx,jsx,ts,js}` file, it:

1. Reads the raw file content as a string
2. Uses the TypeScript compiler API to parse the AST (TS can parse JS/JSX files too)
3. For each named export:
   - Finds the arrow function or function expression
   - Extracts the JSX return expression as a **raw substring from the original source text** (not a reconstructed AST printout — this preserves original formatting)
   - For single-expression arrow functions (`() => <Foo />`): extracts the JSX
   - For block-body functions: extracts the full function body
4. Extracts all import statements from the file
5. Transforms import paths to use the configured `importPrefix` or resolved Vite aliases
6. Stores everything in the virtual source module

### 5.2 Supported and Unsupported Patterns

**Supported (source extracted cleanly):**

```tsx
// Simple arrow function
export const Primary = () => <Button variant="primary">Click me</Button>

// Arrow function with parens
export const WithIcon = () => <Button icon={<Star />}>Starred</Button>

// Block body with hooks
export const Stateful = () => {
  const [count, setCount] = useState(0)
  return <Button onClick={() => setCount((c) => c + 1)}>Count: {count}</Button>
}

// Function declaration
export function Large() {
  return <Button size="large">Large</Button>
}
```

**Unsupported (full export statement shown as fallback):**

```tsx
// forwardRef
export const WithRef = React.forwardRef((props, ref) => (
  <Button ref={ref} {...props} />
))

// HOC wrapped
export const Themed = withTheme(() => <Button>Themed</Button>)

// Variable reference (no inline function)
const myComponent = () => <Button>Test</Button>
export const Aliased = myComponent
```

For unsupported patterns, Atlas shows the entire export statement as the source code. This is always correct — just less minimal than the ideal extracted JSX.

### 5.3 What Gets Shown

For simple examples:

```tsx
// Source file
export const Primary = () => <Button variant="primary">Click me</Button>

// Displayed code
;<Button variant="primary">Click me</Button>
```

For complex examples:

```tsx
// Source file
export const FullExample = () => {
  const [count, setCount] = useState(0)
  return (
    <Button onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times
    </Button>
  )
}

// Displayed code (full body, including hooks)
const [count, setCount] = useState(0)
return (
  <Button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</Button>
)
```

### 5.4 Import Display

The imports from the examples file are shown at the top of the component page, transformed to use canonical import paths:

```tsx
// Raw imports in examples file
import { Button } from './Button'
import { Star } from 'lucide-react'

// Displayed imports (with importPrefix: '@acme/ui')
import { Button } from '@acme/ui/Button'
import { Star } from 'lucide-react'
```

Third-party imports (`lucide-react`, etc.) are left as-is. Only local imports are rewritten.

---

## 6. AI Agent Interface

Atlas is designed to be consumed by AI agents as easily as by humans. Every piece of information visible in the Atlas UI is also available in machine-readable formats via JSON API endpoints, CLI commands, and downloadable context files.

### 6.1 Design Principle

AI agents consume components in two contexts: **writing new code** that uses existing components, and **maintaining/extending** existing components. Atlas serves both by making the full component specification available in formats optimized for LLM context windows — plain text, structured JSON, and markdown.

### 6.2 JSON API Endpoints

All endpoints are served during development and included in the static export.

**`GET /_atlas/api/manifest.json`**

The full component catalogue. An agent can fetch this to understand what components exist without parsing HTML.

```json
{
  "title": "Atlas",
  "components": [
    {
      "slug": "button",
      "name": "Button",
      "group": "components",
      "importPath": "@acme/ui/Button",
      "examplesCount": 5,
      "hasDocsFile": true,
      "exports": ["Primary", "Secondary", "WithIcon", "Disabled", "FullExample"]
    },
    {
      "slug": "patterns-formlayout",
      "name": "FormLayout",
      "group": "patterns",
      "importPath": null,
      "examplesCount": 2,
      "hasDocsFile": false,
      "exports": ["BasicForm", "WithValidation"]
    }
  ]
}
```

**`GET /_atlas/api/component/:slug.json`**

Everything about a single component in one request. This is the "tell me everything about Button" endpoint.

```json
{
  "slug": "button",
  "name": "Button",
  "group": "components",
  "importPath": "@acme/ui/Button",
  "props": [
    {
      "name": "variant",
      "type": "'primary' | 'secondary'",
      "required": false,
      "default": "'primary'",
      "description": "The visual style of the button"
    }
  ],
  "examples": [
    {
      "name": "Primary",
      "title": "Primary Button",
      "description": "The default button style used for primary actions.",
      "source": "<Button variant=\"primary\">Click me</Button>"
    }
  ],
  "imports": "import { Button } from '@acme/ui/Button';",
  "docs": "Our button component supports multiple variants for different action levels..."
}
```

**`GET /_atlas/api/all.json`**

The entire Atlas catalogue — every component with full props, examples, and docs — in one request. For agents that want to load everything into context at once.

Supports selective fetching: `GET /_atlas/api/all.json?components=button,card,input` returns only the named components. The full response includes a `totalComponents` count so agents can decide whether to load everything.

### 6.3 Downloadable Context File

Each component page includes a **"Download for AI"** button that downloads a `Button.atlas.md` file. This file is a structured markdown document optimized for LLM consumption:

````markdown
# Button

> import { Button } from '@acme/ui/Button'

## Props

| Name     | Type                     | Required | Default   | Description                    |
| -------- | ------------------------ | -------- | --------- | ------------------------------ |
| variant  | 'primary' \| 'secondary' | No       | 'primary' | The visual style               |
| disabled | boolean                  | No       | false     | Whether the button is disabled |
| children | ReactNode                | Yes      | —         | Button content                 |

## Docs

Our button component supports multiple variants for different action levels.

## Examples

### Primary Button

The default button style used for primary actions.

\```tsx
<Button variant="primary">Click me</Button>
\```

### Disabled

\```tsx
<Button disabled>Can't click</Button>
\```

### Full Example

\```tsx
const [count, setCount] = useState(0);
return (
<Button onClick={() => setCount(c => c + 1)}>
Clicked {count} times
</Button>
);
\```
````

The same content is available at `GET /_atlas/api/component/:slug.md` for programmatic access.

### 6.4 Full Context Block

Each component page also includes a **"Copy Full Context"** button that copies the entire component specification (identical to the downloadable `.atlas.md` content) to the clipboard. This is for the workflow where a developer is already in a chat with an AI agent and wants to paste a component's full context in one action.

### 6.5 CLI Commands

Atlas ships a CLI for agent workflows that operate in the terminal (e.g., Claude Code, Cursor terminal, shell scripts). The CLI boots a minimal Vite instance in SSR mode to resolve the project's `vite.config.ts` and extract Atlas plugin options. This ensures the CLI and the plugin always use the same configuration.

**`npx atlas context <ComponentName> [ComponentName...]`**

Outputs the full context block for one or more named components to stdout. An agent running in a terminal can pipe this directly into its context.

```bash
# Single component
npx atlas context Button

# Multiple components
npx atlas context Button Card Input

# Pipe into a file for agent consumption
npx atlas context Button Card > context.md
```

**`npx atlas list`**

Outputs all discovered components as a simple list. Useful for agents to understand what already exists before generating new components.

```bash
$ npx atlas list
components/Button (5 examples)
components/Card (3 examples)
components/Input (4 examples)
patterns/FormLayout (2 examples)
layout/Sidebar (2 examples)
layout/Grid (3 examples)
```

**`npx atlas validate <filepath>`**

Validates that an examples file follows Atlas conventions and reports errors. An agent can run this after generating files to self-check.

```bash
$ npx atlas validate src/components/Button/Button.examples.tsx
✓ Button.examples.tsx — 5 exports, all valid

$ npx atlas validate src/components/Modal/Modal.examples.tsx
✗ Modal.examples.tsx
  - Export "Default" is not a function (found: object)
  - Export "withClose" should be PascalCase (suggestion: WithClose)
```

**`npx atlas export`**

Exports the Atlas UI as a static site. Outputs both the browsable HTML site and all JSON API endpoints as static files.

```bash
# Default output directory
npx atlas export

# Custom output directory
npx atlas export --outdir docs/atlas
```

### 6.6 Static Export

The production build outputs both formats:

- **Standalone HTML site** — the full Atlas UI, browsable in any browser, deployable anywhere. Output to a configurable directory (default: `atlas-static/`).
- **JSON API files** — all `/_atlas/api/*` endpoints as static `.json` and `.md` files in the same output directory. These remain available for agent consumption even when the dev server isn't running.

```
atlas-static/
  index.html
  assets/
  api/
    manifest.json
    all.json
    component/
      button.json
      button.md
      card.json
      card.md
      patterns-formlayout.json
      patterns-formlayout.md
      ...
```

---

## 7. Props Extraction — Detail

### 7.1 Strategy

Atlas finds the component to extract props from by **following the imports in the examples file**, not by guessing from the filename. This handles all common project structures.

**Resolution order:**

1. Parse the examples file's import statements
2. Find imports that reference local files (not `node_modules`)
3. Resolve each import to an actual file using Vite's module resolution
4. For each resolved file, look for a React component matching the examples file's name
5. Extract props from that component's type/interface

**This handles:**

- `Button/Button.tsx` (direct sibling)
- `Button/index.tsx` (index file pattern)
- Re-exports (`Button.tsx` re-exports from an internal file)
- Components imported from workspace packages in monorepos

**Fallback:** If no matching component can be found via import resolution, fall back to looking for a sibling file named `ComponentName.tsx` or `ComponentName/index.tsx`.

### 7.2 What Gets Extracted

For each prop:

| Field         | Source                                      |
| ------------- | ------------------------------------------- |
| `name`        | Property name                               |
| `type`        | Type annotation as string                   |
| `required`    | Whether it has `?` optional marker          |
| `default`     | From destructuring defaults or defaultProps |
| `description` | JSDoc comment above the property            |

### 7.3 JavaScript Files

For `.js` and `.jsx` files without TypeScript type annotations, props extraction is skipped gracefully. The props table is simply omitted from the component page and the API responses. This is not an error.

### 7.4 Limitations

- Union types are displayed as-is (`'primary' | 'secondary'`)
- Complex generic types are displayed as-is
- Props from extended interfaces are flattened
- If the props type cannot be resolved, the props table is omitted (not an error)

---

## 8. Agent Skill Document (`ATLAS_SKILL.md`)

The skill document is a self-contained specification file shipped with the Atlas package. It is designed to be dropped into any AI agent's context to enable correct Atlas-compatible file generation.

### 8.1 Structure

```markdown
# Atlas Component Documentation — Agent Skill

## Purpose

You are creating component examples and documentation for Atlas,
a React component documentation tool. Follow these conventions exactly.

## File Conventions

[exact file naming rules, locations, relationships]

## Examples File Specification

[complete format spec with annotated examples]

## Composition Patterns

[how to create multi-component examples in the patterns/ directory]

## Metadata Properties

[every property, its type, and when to use it]
[both AtlasExample type and example() utility shown]

## Documentation File Specification

[MD and MDX format, available components, structure]

## What Makes a Good Example

[guidance on realistic examples vs trivial ones]

## Common Mistakes

[anti-patterns to avoid]

## Templates

[copy-paste starter templates for examples and docs files]
```

### 8.2 Design Principles for the Skill Document

- Written as **instructions to follow**, not documentation to read
- Every rule is accompanied by a **concrete example**
- Includes **anti-examples** (what NOT to do) with explanations
- Fits in a **single file under 3,000 tokens** to be context-window friendly
- Uses **no jargon** that requires knowledge of Atlas internals
- Includes **complete, working templates** that can be copied verbatim

### 8.3 Skill Document Content Outline

1. **File naming and location** — where to put files, what to name them, supported extensions
2. **Examples file format** — named exports, JSX return, both metadata approaches (type helper and utility function)
3. **Composition patterns** — when and how to create multi-component examples in the `patterns/` directory
4. **Documentation file format** — when to use MD vs MDX, available special components
5. **Example quality guidance:**
   - Show realistic usage, not bare components
   - Include state and interaction when relevant
   - Show edge cases (long text, empty state, error state)
   - One example per meaningful variation
   - Don't create examples for every prop permutation
   - Show how components work together in composition examples
6. **Props documentation guidance:**
   - Add JSDoc comments to every prop in the component's interface
   - Include `@default` tags for default values
   - Use union types for constrained string props
7. **Templates:**
   - Starter `*.examples.tsx` template
   - Starter composition `patterns/*.examples.tsx` template
   - Starter `*.md` docs template
   - Starter `*.mdx` docs template

---

## 9. Error Handling

Atlas should never crash the host project's dev server. Errors are contained and surfaced gracefully.

### 9.1 Philosophy

- **Discovery errors** (bad glob, no files found) → log a warning to the console, serve an empty Atlas UI
- **Syntax errors in examples files** → show an error card in place of the preview with the error message; other examples continue to render
- **Runtime errors in examples** (component throws during render) → caught by an error boundary, show an error card with the stack trace; other examples continue to render
- **Props extraction failures** (unsupported type pattern, file not found) → silently omit the props table; this is not an error
- **MDX parse errors** → show an error message in place of the docs content; examples still render
- **Slug collisions** → throw at startup with both file paths; this is a hard error that must be fixed
- **Missing wrapper file** → throw at startup; this is a config error that must be fixed

### 9.2 CLI Error Handling

- `atlas list` with no examples found → exit 0, print "No Atlas examples found. Expected files matching: [pattern]"
- `atlas context Button` with unknown component → exit 1, print "Component 'Button' not found. Available: Card, Input, ..."
- `atlas validate` with invalid file → exit 1, print specific validation errors
- `atlas export` with build failure → exit 1, print the underlying error

### 9.3 Error Card UI

When an example fails to render, the error card shows:

```
┌──────────────────────────────────────────┐
│  ⚠ Primary — Render Error                │
│                                          │
│  TypeError: Cannot read properties of    │
│  undefined (reading 'variant')           │
│                                          │
│  This example threw during render.       │
│  The source code is still shown below.   │
└──────────────────────────────────────────┘
```

The source code block is always shown, even when the preview fails. This ensures the code snippet remains useful.

---

## 10. Implementation Plan

### Phase 1: Plugin Foundation

**Goal:** Atlas discovers example files and serves a manifest.

**Tasks:**

- [ ] Create the Vite plugin skeleton (`vite-plugin-atlas`)
- [ ] Implement file discovery using `fast-glob` (support `.tsx`, `.jsx`, `.ts`, `.js`)
- [ ] Implement slug generation algorithm with collision detection
- [ ] Build the manifest data structure
- [ ] Serve `virtual:atlas-manifest` as a virtual module
- [ ] Add file watching for new/deleted example files
- [ ] Trigger HMR updates when the manifest changes
- [ ] Implement `importPrefix` config and Vite alias resolution fallback
- [ ] Ship `AtlasExample` type helper and `example()` utility function
- [ ] Write unit tests for file discovery, slug generation, and manifest

**Output:** A Vite plugin that can be added to a project and logs discovered components to the console.

### Phase 2: Source Code Extraction

**Goal:** Each example's source code is extracted and available as a virtual module.

**Tasks:**

- [ ] Parse example files using TypeScript compiler API (handles both TS and JS)
- [ ] Extract each named export's function body as raw source substring
- [ ] Extract import statements and transform local imports using `importPrefix`/aliases
- [ ] Serve `virtual:atlas-source/{slug}` virtual modules
- [ ] Handle supported patterns (arrow, block body, function declaration)
- [ ] Implement fallback for unsupported patterns (show full export statement)
- [ ] Update extracted source on file changes (HMR)
- [ ] Write unit tests for source extraction including edge cases

**Output:** Virtual modules containing accurate, copyable source strings for every example.

### Phase 3: Props Extraction

**Goal:** Component props are automatically extracted from TypeScript types.

**Tasks:**

- [ ] Follow imports in examples file to resolve component file (not filename guessing)
- [ ] Handle `index.tsx`, re-exports, and monorepo workspace imports
- [ ] Parse component file with TypeScript compiler API
- [ ] Find props type/interface
- [ ] Extract prop names, types, required status, defaults, JSDoc descriptions
- [ ] Serve `virtual:atlas-props/{slug}` virtual modules
- [ ] Gracefully skip for `.js`/`.jsx` files (empty props array, no error)
- [ ] Handle missing/unresolvable props gracefully (no errors)
- [ ] Write unit tests for props extraction

**Output:** Virtual modules containing structured props data for every component.

### Phase 4: Atlas UI — Index Page

**Goal:** A browsable index of all components served at `/_atlas`.

**Tasks:**

- [ ] Create the Atlas UI React app (self-contained, bundled with plugin)
- [ ] Implement the index page layout
- [ ] Import and display data from `virtual:atlas-manifest`
- [ ] Render component cards grouped by directory (including patterns group)
- [ ] Lazy-render first example as thumbnail preview using `IntersectionObserver`
- [ ] Implement search/filter
- [ ] Serve the UI app via Vite middleware at the configured route
- [ ] Style with embedded CSS (no host project dependencies)
- [ ] Groups are collapsible

**Output:** A working index page listing all discovered components with lazy-loaded previews.

### Phase 5: Atlas UI — Component Page

**Goal:** Deep-linkable component documentation pages.

**Tasks:**

- [ ] Implement component page routing (`/_atlas/:slug`)
- [ ] Dynamic import of example modules for live rendering
- [ ] Dynamically import and apply global wrapper from file path config
- [ ] Apply per-example wrappers nested inside global wrapper
- [ ] Render each example in a preview card
- [ ] Display extracted source code with syntax highlighting (Shiki)
- [ ] Add copy-to-clipboard for source snippets
- [ ] Display auto-extracted props table (omit for JS files)
- [ ] Display auto-generated import statement (using `importPrefix`)
- [ ] Add anchor links for each example
- [ ] Back navigation to index
- [ ] Implement sticky sidebar with anchor links (Props, Docs, each example)
- [ ] Implement minimap on the right with scroll position indicator
- [ ] Implement error boundaries around each example preview
- [ ] Show error cards for failed renders (source code still visible)

**Output:** Full component documentation pages with live previews, copyable code, sidebar navigation, and minimap.

### Phase 6: Markdown & MDX Support

**Goal:** Render authored documentation alongside examples.

**Tasks:**

- [ ] Integrate `@mdx-js/rollup` for MDX transformation (scoped to Atlas docs files only)
- [ ] Render Markdown files as HTML
- [ ] Implement `<AtlasExample name="..." />` component for MDX
- [ ] Implement `<AtlasProps />` component for MDX
- [ ] Auto-generate a default docs page when no MD/MDX exists
- [ ] Show error message for MDX parse errors (examples still render)
- [ ] HMR for docs file changes

**Output:** Full documentation rendering with support for authored prose alongside auto-generated content.

### Phase 7: AI Agent Interface

**Goal:** Machine-readable API endpoints and downloadable context files.

**Tasks:**

- [ ] Build the structured markdown context file generator (shared by download, copy, CLI, and API)
- [ ] Implement `/_atlas/api/manifest.json` endpoint
- [ ] Implement `/_atlas/api/component/:slug.json` endpoint
- [ ] Implement `/_atlas/api/component/:slug.md` endpoint (markdown context file)
- [ ] Implement `/_atlas/api/all.json` endpoint with `?components=` selective fetching
- [ ] Add "Download for AI" button on component page (downloads `ComponentName.atlas.md`)
- [ ] Add "Copy Full Context" button on component page (copies markdown to clipboard)
- [ ] Ensure all endpoints are served in dev and included in static export

**Output:** Complete machine-readable API surface for AI agent consumption.

### Phase 8: CLI Commands

**Goal:** Terminal-accessible commands for agent workflows.

**Tasks:**

- [ ] Implement minimal Vite instance boot for config resolution
- [ ] Implement `npx atlas list` — output discovered components to stdout
- [ ] Implement `npx atlas context <ComponentName>` — output full context for named components to stdout
- [ ] Implement `npx atlas validate <filepath>` — validate examples file conventions
- [ ] Implement `npx atlas export` — static export of HTML site + API files
- [ ] Support `--outdir` flag for export command
- [ ] Implement CLI error handling (exit codes, human-readable messages)
- [ ] Write CLI help text

**Output:** CLI tools for agent and developer workflows in the terminal.

### Phase 9: Agent Skill Document

**Goal:** Ship a portable skill document that AI agents can use to produce Atlas-compatible files.

**Tasks:**

- [ ] Write `ATLAS_SKILL.md` following the structure in Section 8
- [ ] Include complete working templates (single component and composition patterns)
- [ ] Include both metadata approaches (type helper and utility function)
- [ ] Include anti-examples and common mistakes
- [ ] Test with multiple AI tools (Claude, Copilot, Cursor) to verify outputs
- [ ] Keep under 3,000 tokens
- [ ] Include in the published npm package

**Output:** A single file that, when provided to any AI coding agent, results in correctly structured Atlas files.

### Phase 10: Polish & Production

**Goal:** Production readiness.

**Tasks:**

- [ ] Dark/light mode (follows system preference, toggle available)
- [ ] Responsive layout for the Atlas UI
- [ ] Loading states for dynamic imports
- [ ] 404 handling for unknown component slugs
- [ ] Performance: lazy-load component pages
- [ ] Verify static export includes all API endpoints and downloadable files
- [ ] README and npm package documentation
- [ ] Publish to npm

**Output:** A polished, publishable Vite plugin.

---

## 11. Dependencies

### Runtime Dependencies (shipped with Atlas)

| Package          | Purpose             |
| ---------------- | ------------------- |
| `fast-glob`      | File discovery      |
| `shiki`          | Syntax highlighting |
| `@mdx-js/rollup` | MDX transformation  |

### Peer Dependencies

| Package      | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `typescript` | Props and source extraction (optional — gracefully degraded without it) |
| `react`      | Required by the host project                                            |
| `vite`       | Required by the host project                                            |

### No Dependencies On

- React Router
- Tailwind CSS
- Any CSS-in-JS library
- Any state management library
- Any AI/LLM provider
- Any external API

---

## 12. Package Structure

```
vite-plugin-atlas/
  src/
    plugin/
      index.ts              ← Vite plugin entry point
      config.ts             ← config resolution, importPrefix, alias reading
      discovery.ts          ← file globbing, watching, slug generation
      manifest.ts           ← manifest generation
      source-extractor.ts   ← source code extraction (TS compiler API)
      props-extractor.ts    ← TypeScript props extraction
      import-resolver.ts    ← follows imports to find component files
      virtual-modules.ts    ← virtual module resolution
      mdx.ts                ← MDX integration
    api/
      routes.ts             ← API endpoint handlers
      context-generator.ts  ← generates .atlas.md context files
      json-serializers.ts   ← manifest/component JSON formatters
    cli/
      index.ts              ← CLI entry point
      vite-boot.ts          ← minimal Vite instance for config resolution
      list.ts               ← `atlas list` command
      context.ts            ← `atlas context` command
      validate.ts           ← `atlas validate` command
      export.ts             ← `atlas export` command
    ui/
      App.tsx               ← Atlas UI root
      IndexPage.tsx         ← component listing
      ComponentPage.tsx     ← component documentation
      PropsTable.tsx        ← props display
      ExampleCard.tsx       ← example preview + source
      ErrorCard.tsx         ← error boundary fallback UI
      CodeBlock.tsx         ← syntax highlighted code
      CopyButton.tsx        ← clipboard utility
      DownloadButton.tsx    ← "Download for AI" button
      ContextButton.tsx     ← "Copy Full Context" button
      Sidebar.tsx           ← sticky sidebar navigation
      Minimap.tsx           ← minimap scroll overview
      SearchBar.tsx         ← search/filter
      styles.css            ← all styles, embedded
    types/
      index.ts              ← AtlasExample type, example() utility, shared types
  ATLAS_SKILL.md            ← agent skill document
  README.md                 ← package documentation
  package.json
  tsconfig.json
```

---

## 13. Resolved Design Decisions

1. **Example isolation** — Start without isolation. Add iframe mode as an opt-in if CSS leakage becomes an issue in practice.

2. **Monorepo support** — Supported via the `pattern` config accepting an array of globs. No special monorepo detection logic.

3. **Component wrappers** — Both per-example (`wrapper` metadata property) and global (`wrapper` plugin config as a file path string) are supported. Per-example wrappers nest inside the global wrapper. The wrapper file is dynamically imported at render time, not at Vite config time.

4. **Static export format** — Both. `npx atlas export` outputs a standalone browsable HTML site AND all JSON/markdown API endpoints as static files in the same directory.

5. **Slug generation** — Full path-based slugs to prevent collisions. Collisions detected at startup with a clear error.

6. **File extensions** — `*.examples.{tsx,jsx,ts,js}` all supported. Props extraction gracefully degrades for JS files.

7. **Metadata typing** — Both `AtlasExample` type helper and `example()` utility function shipped. Users choose their preference.

8. **CLI config resolution** — CLI boots a minimal Vite instance in SSR mode to resolve `vite.config.ts`. This ensures CLI and plugin always share the same configuration.

9. **Import path resolution** — Explicit `importPrefix` config takes priority, then Vite `resolve.alias` is read, then relative-from-root fallback.

10. **Props extraction** — Follows imports in the examples file to find the component, rather than guessing from the filename. Handles `index.tsx`, re-exports, and monorepo imports.

11. **Source extraction** — TypeScript compiler API only (no regex). Unsupported patterns fall back to showing the full export statement.

12. **Composition examples** — Multi-component examples are first-class. They live in a `patterns/` directory (or any directory) and appear as their own group. No special configuration needed.

---

## 14. Non-Goals (Explicit)

These are things Atlas will never do:

- **Addon/extension system** — there is no plugin API for Atlas itself
- **Args/controls panel** — write another example instead
- **Visual regression testing** — use a dedicated tool
- **Responsive preview modes** — resize your browser
- **Multiple themes/modes** — use the wrapper metadata for that
- **A11y auditing** — use a dedicated tool
- **Design token documentation** — out of scope
- **Figma integration** — out of scope
- **Custom page templates** — the one layout is the layout
- **Deployment platform** — it builds static files, deploy them however you want
- **Built-in AI generation** — Atlas renders docs, it doesn't write them
