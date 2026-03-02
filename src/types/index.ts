import type { ComponentType, ReactNode } from 'react'

/** Metadata properties that can be attached to an example export */
export interface AtlasExampleMeta {
  title?: string
  description?: string
  wrapper?: ComponentType<{ children: ReactNode }>
  order?: number
}

/** A React component function with optional Atlas metadata */
export type AtlasExample = (() => ReactNode) & AtlasExampleMeta

/** Zero-overhead utility that attaches metadata to an example function */
export function example(
  fn: () => ReactNode,
  meta: AtlasExampleMeta,
): AtlasExample {
  const ex = fn as AtlasExample
  if (meta.title !== undefined) ex.title = meta.title
  if (meta.description !== undefined) ex.description = meta.description
  if (meta.wrapper !== undefined) ex.wrapper = meta.wrapper
  if (meta.order !== undefined) ex.order = meta.order
  return ex
}

/** Plugin configuration options */
export interface AtlasConfig {
  pattern?: string | string[]
  route?: string
  title?: string
  ignore?: string[]
  wrapper?: string
  /** CSS files to inject into component previews (e.g., your app's global styles). Paths are relative to project root. */
  styles?: string[]
  importPrefix?: string
  /** Rewrite relative imports to an npm package path. Accepts a string (replaces all) or a function for custom mapping. */
  importPackage?:
    | string
    | ((importPath: string, examplesFile: string) => string)
}

/** Resolved internal config with defaults applied */
export interface ResolvedAtlasConfig {
  pattern: string[]
  route: string
  title: string
  ignore: string[]
  wrapper: string | null
  styles: string[]
  importPrefix: string | null
  importPackage:
    | string
    | ((importPath: string, examplesFile: string) => string)
    | null
}

/** A discovered component entry in the manifest */
export interface AtlasComponentEntry {
  slug: string
  name: string
  group: string
  path: string
  examplesFile: string
  docsFile: string | null
  exports: string[]
}

/** Extracted prop information */
export interface AtlasProp {
  name: string
  type: string
  required: boolean
  default: string | undefined
  description: string
}

/** Source information for a component's examples */
export interface AtlasSource {
  sources: Record<string, string>
  imports: string
}
