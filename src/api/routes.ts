import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { extractProps } from '../plugin/props-extractor.js';
import { extractSources } from '../plugin/source-extractor.js';
import type { AtlasComponentEntry, ResolvedAtlasConfig } from '../types/index.js';

function sendJson(res: ServerResponse, data: unknown, status = 200) {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data, null, 2));
}

function sendText(res: ServerResponse, text: string, contentType: string, status = 200) {
	res.writeHead(status, { 'Content-Type': contentType });
	res.end(text);
}

function send404(res: ServerResponse, message: string) {
	sendJson(res, { error: message }, 404);
}

/**
 * Handle Atlas API requests.
 * Returns true if the request was handled.
 */
export async function handleApiRequest(
	req: IncomingMessage,
	res: ServerResponse,
	apiPath: string,
	manifest: AtlasComponentEntry[],
	root: string,
	config: ResolvedAtlasConfig,
): Promise<boolean> {
	// GET /api/manifest.json
	if (apiPath === '/api/manifest.json') {
		sendJson(res, { components: manifest });
		return true;
	}

	// GET /api/all.json
	if (apiPath === '/api/all.json') {
		const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
		const componentsParam = url.searchParams.get('components');
		let filtered = manifest;

		if (componentsParam) {
			const slugs = componentsParam.split(',').map((s) => s.trim());
			filtered = manifest.filter((e) => slugs.includes(e.slug));
		}

		const results = await Promise.all(
			filtered.map(async (entry) => {
				const filePath = path.join(root, entry.examplesFile);
				let sources = {};
				let imports = '';

				try {
					const content = await fs.readFile(filePath, 'utf-8');
					const result = extractSources(entry.examplesFile, content, config.importPrefix);
					sources = result.sources;
					imports = result.imports;
				} catch {
					// Skip source extraction errors
				}

				const props = await extractProps(entry.examplesFile, entry.name, root);

				return {
					...entry,
					sources,
					imports,
					props,
				};
			}),
		);

		sendJson(res, { components: results });
		return true;
	}

	// GET /api/component/:slug.json
	const jsonMatch = apiPath.match(/^\/api\/component\/([^/]+)\.json$/);
	if (jsonMatch) {
		const slug = jsonMatch[1];
		const entry = manifest.find((e) => e.slug === slug);
		if (!entry) {
			send404(res, `Component "${slug}" not found`);
			return true;
		}

		const filePath = path.join(root, entry.examplesFile);
		let sources = {};
		let imports = '';

		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const result = extractSources(entry.examplesFile, content, config.importPrefix);
			sources = result.sources;
			imports = result.imports;
		} catch {
			// Skip source extraction errors
		}

		const props = await extractProps(entry.examplesFile, entry.name, root);

		sendJson(res, { ...entry, sources, imports, props });
		return true;
	}

	// GET /api/component/:slug.md
	const mdMatch = apiPath.match(/^\/api\/component\/([^/]+)\.md$/);
	if (mdMatch) {
		const slug = mdMatch[1];
		const entry = manifest.find((e) => e.slug === slug);
		if (!entry) {
			send404(res, `Component "${slug}" not found`);
			return true;
		}

		// Generate markdown context
		const filePath = path.join(root, entry.examplesFile);
		let sources: Record<string, string> = {};
		let imports = '';

		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const result = extractSources(entry.examplesFile, content, config.importPrefix);
			sources = result.sources;
			imports = result.imports;
		} catch {
			// Skip source extraction errors
		}

		const props = await extractProps(entry.examplesFile, entry.name, root);

		let md = `# ${entry.name}\n\n`;
		md += `**Group:** ${entry.group}\n`;
		md += `**File:** ${entry.examplesFile}\n\n`;

		if (imports) {
			md += `## Imports\n\n\`\`\`tsx\n${imports}\n\`\`\`\n\n`;
		}

		if (Object.keys(sources).length > 0) {
			md += `## Examples\n\n`;
			for (const [name, source] of Object.entries(sources)) {
				md += `### ${name}\n\n\`\`\`tsx\n${source}\n\`\`\`\n\n`;
			}
		}

		if (props.length > 0) {
			md += `## Props\n\n`;
			md += `| Name | Type | Required | Default | Description |\n`;
			md += `|------|------|----------|---------|-------------|\n`;
			for (const prop of props) {
				md += `| ${prop.name} | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | ${prop.default ? `\`${prop.default}\`` : '-'} | ${prop.description || '-'} |\n`;
			}
			md += '\n';
		}

		// Include docs file content if available
		if (entry.docsFile) {
			try {
				const docsContent = await fs.readFile(path.join(root, entry.docsFile), 'utf-8');
				md += `## Documentation\n\n${docsContent}\n`;
			} catch {
				// Skip if docs file can't be read
			}
		}

		sendText(res, md, 'text/markdown');
		return true;
	}

	return false;
}
