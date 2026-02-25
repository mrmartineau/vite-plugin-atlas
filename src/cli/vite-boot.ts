import { createServer } from 'vite';
import { resolveConfig } from '../plugin/config.js';
import { discoverExamples } from '../plugin/discovery.js';
import type { AtlasComponentEntry, ResolvedAtlasConfig } from '../types/index.js';

export interface AtlasContext {
	root: string;
	config: ResolvedAtlasConfig;
	manifest: AtlasComponentEntry[];
}

/**
 * Boot a minimal Vite instance to resolve the project's config,
 * extract Atlas plugin options, and discover example files.
 */
export async function bootAtlas(cwd?: string): Promise<AtlasContext> {
	const root = cwd || process.cwd();

	// Create a minimal Vite server to resolve config
	const server = await createServer({
		root,
		server: { middlewareMode: true },
		logLevel: 'silent',
	});

	// Find the Atlas plugin config from the resolved Vite config
	const viteConfig = server.config;

	// Resolve Atlas config using Vite's resolved aliases
	const config = resolveConfig({}, viteConfig);

	// Close the server — we only needed it for config resolution
	await server.close();

	// Discover example files
	const manifest = await discoverExamples(root, config);

	return { root, config, manifest };
}
