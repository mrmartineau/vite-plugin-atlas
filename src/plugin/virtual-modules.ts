import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AtlasComponentEntry, ResolvedAtlasConfig } from '../types/index.js';
import { extractProps } from './props-extractor.js';
import { extractSources } from './source-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the path to the UI source directory.
 * When built, __dirname is `dist/plugin/`. The UI source lives in `src/ui/`.
 */
export function getUiDir(): string {
	const packageRoot = path.resolve(__dirname, '../..');
	return path.resolve(packageRoot, 'src/ui');
}

const UI_PREFIX = 'virtual:atlas-ui/';

/**
 * Check if an ID is an Atlas virtual module and return the resolved ID.
 */
export function resolveVirtualModuleId(id: string, uiDir?: string): string | null {
	if (id === 'virtual:atlas-manifest') return '\0virtual:atlas-manifest';
	if (id === 'virtual:atlas-config') return '\0virtual:atlas-config';
	if (id === 'virtual:atlas-ui-entry') return '\0virtual:atlas-ui-entry';

	if (id.startsWith('virtual:atlas-source/')) return `\0${id}`;
	if (id.startsWith('virtual:atlas-props/')) return `\0${id}`;

	// Resolve UI file imports to absolute paths so Vite loads them directly
	if (id.startsWith(UI_PREFIX) && uiDir) {
		const file = id.slice(UI_PREFIX.length);
		return path.join(uiDir, file);
	}

	return null;
}

/**
 * Generate the virtual module code for a given resolved ID.
 */
export async function loadVirtualModule(
	id: string,
	manifest: AtlasComponentEntry[],
	root: string,
	config: ResolvedAtlasConfig,
): Promise<string | null> {
	const virtualId = id.startsWith('\0') ? id.slice(1) : id;

	if (virtualId === 'virtual:atlas-manifest') {
		return `export const manifest = ${JSON.stringify(manifest, null, 2)};`;
	}

	if (virtualId === 'virtual:atlas-config') {
		const configData = {
			route: config.route,
			title: config.title,
			wrapper: config.wrapper,
		};
		return `export const config = ${JSON.stringify(configData, null, 2)};`;
	}

	if (virtualId === 'virtual:atlas-ui-entry') {
		return [
			`import '${UI_PREFIX}styles.css';`,
			`import { createElement } from 'react';`,
			`import { createRoot } from 'react-dom/client';`,
			`import { App } from '${UI_PREFIX}App.tsx';`,
			``,
			`const container = document.getElementById('atlas-root');`,
			`if (container) {`,
			`  const root = createRoot(container);`,
			`  root.render(createElement(App));`,
			`}`,
		].join('\n');
	}

	// virtual:atlas-source/{slug}
	if (virtualId.startsWith('virtual:atlas-source/')) {
		const slug = virtualId.slice('virtual:atlas-source/'.length);
		const entry = manifest.find((e) => e.slug === slug);
		if (!entry) return null;

		const filePath = path.join(root, entry.examplesFile);
		let fileContent: string;
		try {
			fileContent = await fs.readFile(filePath, 'utf-8');
		} catch {
			return `export const sources = {};\nexport const imports = '';`;
		}

		const result = extractSources(entry.examplesFile, fileContent, config.importPrefix);

		return [
			`export const sources = ${JSON.stringify(result.sources, null, 2)};`,
			`export const imports = ${JSON.stringify(result.imports)};`,
		].join('\n');
	}

	// virtual:atlas-props/{slug}
	if (virtualId.startsWith('virtual:atlas-props/')) {
		const slug = virtualId.slice('virtual:atlas-props/'.length);
		const entry = manifest.find((e) => e.slug === slug);
		if (!entry) return null;

		const props = await extractProps(entry.examplesFile, entry.name, root);
		return `export const props = ${JSON.stringify(props, null, 2)};`;
	}

	return null;
}
