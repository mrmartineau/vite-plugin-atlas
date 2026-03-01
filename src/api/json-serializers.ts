import type { AtlasComponentEntry, AtlasProp } from '../types/index.js'

/**
 * Serialize the manifest for the API response.
 */
export function serializeManifest(entries: AtlasComponentEntry[]): {
  components: AtlasComponentEntry[]
} {
  return { components: entries }
}

/**
 * Serialize a single component with full details for the API response.
 */
export function serializeComponent(
  entry: AtlasComponentEntry,
  sources: Record<string, string>,
  imports: string,
  props: AtlasProp[],
): {
  slug: string
  name: string
  group: string
  path: string
  examplesFile: string
  docsFile: string | null
  exports: string[]
  sources: Record<string, string>
  imports: string
  props: AtlasProp[]
} {
  return {
    ...entry,
    sources,
    imports,
    props,
  }
}
