import fs from 'node:fs/promises'
import path from 'node:path'
import { generateContext } from '../api/context-generator.js'
import { extractProps } from '../plugin/props-extractor.js'
import { extractSources } from '../plugin/source-extractor.js'
import type { AtlasContext } from './vite-boot.js'

/**
 * `atlas context <name> [name...]` — Output component context for AI consumption.
 */
export async function runContext(ctx: AtlasContext, names: string[]): Promise<void> {
  const { manifest, root, config } = ctx

  const outputs: string[] = []

  for (const name of names) {
    const entry = manifest.find(
      (e) => e.name.toLowerCase() === name.toLowerCase() || e.slug === name.toLowerCase(),
    )

    if (!entry) {
      const available = manifest.map((e) => e.name).join(', ')
      process.stderr.write(`Component '${name}' not found. Available: ${available}\n`)
      process.exit(1)
    }

    const filePath = path.join(root, entry.examplesFile)
    let sources: Record<string, string> = {}
    let imports = ''

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const result = extractSources(
        entry.examplesFile,
        content,
        config.importPrefix,
        config.importPackage,
      )
      sources = result.sources
      imports = result.imports
    } catch {
      // Skip source extraction errors
    }

    const props = await extractProps(entry.examplesFile, entry.name, root)

    let docsContent: string | null = null
    if (entry.docsFile) {
      try {
        docsContent = await fs.readFile(path.join(root, entry.docsFile), 'utf-8')
      } catch {
        // Skip if docs file can't be read
      }
    }

    outputs.push(generateContext(entry, sources, imports, props, docsContent))
  }

  console.log(outputs.join('---\n\n'))
}
