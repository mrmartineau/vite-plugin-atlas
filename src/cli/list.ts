import type { AtlasContext } from './vite-boot.js'

/**
 * `atlas list` — List all discovered components to stdout.
 */
export function runList(ctx: AtlasContext): void {
  const { manifest, config } = ctx

  if (manifest.length === 0) {
    const patterns = config.pattern.join(', ')
    console.log(`No Atlas examples found. Expected files matching: ${patterns}`)
    return
  }

  // Sort by group then name
  const sorted = [...manifest].sort((a, b) => {
    const groupCmp = a.group.localeCompare(b.group)
    if (groupCmp !== 0) return groupCmp
    return a.name.localeCompare(b.name)
  })

  for (const entry of sorted) {
    const n = entry.exports.length
    console.log(
      `${entry.group}/${entry.name} (${n} example${n === 1 ? '' : 's'})`,
    )
  }
}
