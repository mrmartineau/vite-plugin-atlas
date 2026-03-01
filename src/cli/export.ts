import fs from 'node:fs/promises'
import path from 'node:path'
import { generateContext } from '../api/context-generator.js'
import {
  serializeComponent,
  serializeManifest,
} from '../api/json-serializers.js'
import { extractProps } from '../plugin/props-extractor.js'
import { extractSources } from '../plugin/source-extractor.js'
import type { AtlasContext } from './vite-boot.js'

/**
 * `atlas export [--outdir dir]` — Export static JSON/markdown files.
 */
export async function runExport(
  ctx: AtlasContext,
  outdir: string,
): Promise<void> {
  const { manifest, root, config } = ctx

  const apiDir = path.join(outdir, 'api')
  const componentDir = path.join(apiDir, 'component')

  // Create output directories
  await fs.mkdir(componentDir, { recursive: true })

  // Write manifest.json
  await fs.writeFile(
    path.join(apiDir, 'manifest.json'),
    JSON.stringify(serializeManifest(manifest), null, 2),
  )

  // Build all component data
  const allComponents = []

  for (const entry of manifest) {
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

    // Write {slug}.json
    const componentJson = serializeComponent(entry, sources, imports, props)
    await fs.writeFile(
      path.join(componentDir, `${entry.slug}.json`),
      JSON.stringify(componentJson, null, 2),
    )

    // Write {slug}.md
    let docsContent: string | null = null
    if (entry.docsFile) {
      try {
        docsContent = await fs.readFile(
          path.join(root, entry.docsFile),
          'utf-8',
        )
      } catch {
        // Skip if docs file can't be read
      }
    }

    const md = generateContext(entry, sources, imports, props, docsContent)
    await fs.writeFile(path.join(componentDir, `${entry.slug}.md`), md)

    allComponents.push(componentJson)
  }

  // Write all.json
  await fs.writeFile(
    path.join(apiDir, 'all.json'),
    JSON.stringify({ components: allComponents }, null, 2),
  )

  console.log(
    `Exported ${manifest.length} component${manifest.length === 1 ? '' : 's'} to ${outdir}/`,
  )
}
