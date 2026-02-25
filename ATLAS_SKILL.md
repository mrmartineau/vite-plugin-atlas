# Atlas Component Documentation — Agent Skill

## Purpose

You are creating component examples and documentation for Atlas, a convention-driven React component documentation tool. Follow these conventions exactly to produce files Atlas can discover and render.

## File Conventions

Place a `*.examples.tsx` file next to the component it documents. This is the only file Atlas requires.

```
src/components/Button/
  Button.tsx              ← the component
  Button.examples.tsx     ← required (makes Button appear in Atlas)
  Button.md               ← optional prose docs
```

**Rules:**
- The filename determines the component name: `Button.examples.tsx` → "Button"
- The directory determines the group: `components/forms/Input.examples.tsx` → group "forms"
- Supported extensions: `.examples.tsx`, `.examples.jsx`, `.examples.ts`, `.examples.js`
- Docs are discovered in order: `Button.mdx`, `Button.md`, `README.mdx`, `README.md` (same directory)

❌ **Wrong:** `Button.example.tsx` (singular), `button-examples.tsx`, `ButtonExamples.tsx`
✅ **Right:** `Button.examples.tsx`

## Examples File Specification

Each **named export** is one example. Each export must be a function returning JSX.

```tsx
// Button.examples.tsx
import { Button } from './Button';

export const Primary = () => <Button variant="primary">Click me</Button>;

export const WithState = () => {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(c => c + 1)}>Clicked {count} times</Button>;
};
```

❌ **Wrong — default export:**
```tsx
export default () => <Button>Click me</Button>;
```

❌ **Wrong — not a function:**
```tsx
export const Primary = <Button>Click me</Button>;
```

❌ **Wrong — returns a string:**
```tsx
export const Primary = () => "hello";
```

## Composition Patterns

Multi-component examples live in a `patterns/` directory (or any directory). They work identically to single-component examples — just import multiple components.

```tsx
// src/patterns/FormLayout.examples.tsx
import { Form } from '../components/Form/Form';
import { Input } from '../components/Input/Input';
import { Button } from '../components/Button/Button';

export const ContactForm = () => (
  <Form onSubmit={console.log}>
    <Input label="Name" placeholder="Enter your name" />
    <Input label="Email" type="email" />
    <Button type="submit">Submit</Button>
  </Form>
);
ContactForm.title = "Contact Form";
ContactForm.description = "Form, Input, and Button working together.";
```

## Metadata Properties

Attach optional metadata as properties on the export function. There are two equivalent approaches:

**Approach A — Type helper** (no runtime overhead):
```tsx
import type { AtlasExample } from 'vite-plugin-atlas';

export const Primary: AtlasExample = () => <Button variant="primary">Click me</Button>;
Primary.title = "Primary Button";
Primary.description = "The default button style for primary actions.";
```

**Approach B — Utility function** (better autocomplete):
```tsx
import { example } from 'vite-plugin-atlas';

export const Primary = example(
  () => <Button variant="primary">Click me</Button>,
  { title: "Primary Button", description: "The default button style for primary actions." }
);
```

**All available properties (this is the complete set):**

| Property      | Type       | Default                            | Purpose                                     |
|---------------|------------|------------------------------------|---------------------------------------------|
| `title`       | `string`   | Export name, de-camelCased         | Display name shown in the UI                |
| `description` | `string`   | —                                  | Short description shown below the title     |
| `wrapper`     | `React.FC` | —                                  | Wrapper component (e.g., theme provider)    |
| `order`       | `number`   | Export order in file               | Sort order among examples                   |

## Documentation File Specification

**Markdown (`.md`)** — standard markdown, rendered above examples:

```md
# Button

A versatile button component supporting multiple variants and sizes.

## Usage Guidelines

Use the primary variant for the main action on a page. Limit to one primary button per view.
```

**MDX (`.mdx`)** — markdown with two special components:

```mdx
# Button

Use the primary button for the main action on a page.

<AtlasExample name="Primary" />

Buttons can be disabled to prevent interaction:

<AtlasExample name="Disabled" />

## Props

<AtlasProps />
```

- `<AtlasExample name="..." />` — renders the named export inline with its source code
- `<AtlasProps />` — renders the auto-extracted props table

The `name` must match an export name from the corresponding `.examples.tsx` file exactly.

## What Makes a Good Example

- **Show realistic usage** — include real labels, icons, and handlers, not `"test"` or `"lorem ipsum"`
- **Include state and interaction** when the component is interactive
- **Show edge cases** — long text, empty states, error states, loading states
- **One example per meaningful variation** — not one per prop permutation
- **Add JSDoc comments** to every prop in the component's TypeScript interface, including `@default` tags

❌ **Trivial — not useful:**
```tsx
export const Example1 = () => <Button>A</Button>;
export const Example2 = () => <Button>B</Button>;
```

✅ **Meaningful — shows real usage:**
```tsx
export const Primary = () => <Button variant="primary">Save Changes</Button>;
export const Destructive = () => <Button variant="danger" icon={<Trash />}>Delete Account</Button>;
export const Loading = () => <Button loading>Submitting…</Button>;
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Using `export default` | Use named exports only |
| File named `*.example.tsx` (singular) | Must be `*.examples.tsx` (plural) |
| Exporting a JSX element instead of a function | Wrap in `() => ...` |
| `<AtlasExample name="primary" />` (wrong case) | Must match export name exactly: `name="Primary"` |
| Adding props not in the metadata spec | Only `title`, `description`, `wrapper`, `order` exist |
| Creating one example per prop | Create one example per meaningful *variation* |

## Templates

**Single component — `ComponentName.examples.tsx`:**
```tsx
import type { AtlasExample } from 'vite-plugin-atlas';
import { ComponentName } from './ComponentName';

export const Default: AtlasExample = () => <ComponentName>Content</ComponentName>;
Default.description = "The default appearance.";

export const WithInteraction: AtlasExample = () => {
  const [active, setActive] = useState(false);
  return <ComponentName active={active} onClick={() => setActive(!active)}>Toggle me</ComponentName>;
};
WithInteraction.description = "Demonstrates interactive behavior.";
```

**Composition pattern — `patterns/PatternName.examples.tsx`:**
```tsx
import { example } from 'vite-plugin-atlas';
import { ComponentA } from '../components/ComponentA/ComponentA';
import { ComponentB } from '../components/ComponentB/ComponentB';

export const BasicPattern = example(
  () => (
    <ComponentA>
      <ComponentB label="Item 1" />
      <ComponentB label="Item 2" />
    </ComponentA>
  ),
  { title: "Basic Pattern", description: "ComponentA and ComponentB composed together." }
);
```

**Docs — `ComponentName.mdx`:**
```mdx
# ComponentName

A short description of the component's purpose and when to use it.

## Variants

<AtlasExample name="Default" />

## Interactive

<AtlasExample name="WithInteraction" />

## Props

<AtlasProps />
```
