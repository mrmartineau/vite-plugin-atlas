import type { AtlasComponentEntry, AtlasProp } from '../types/index.js'

/**
 * Generate a markdown context document for a component.
 */
export function generateContext(
  entry: AtlasComponentEntry,
  sources: Record<string, string>,
  imports: string,
  props: AtlasProp[],
  docsContent: string | null,
): string {
  let md = `# ${entry.name}\n\n`
  md += `**Group:** ${entry.group}\n`
  md += `**File:** ${entry.examplesFile}\n\n`

  if (imports) {
    md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`
  }

  if (Object.keys(sources).length > 0) {
    md += `## Examples\n\n`
    for (const [name, source] of Object.entries(sources)) {
      md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`
    }
  }

  if (props.length > 0) {
    md += `## Props\n\n`
    md += `| Name | Type | Required | Default | Description |\n`
    md += `|------|------|----------|---------|-------------|\n`
    for (const prop of props) {
      md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`
    }
    md += '\n'
  }

  if (docsContent) {
    md += `## Documentation\n\n${docsContent}\n`
  }

  return md
}
