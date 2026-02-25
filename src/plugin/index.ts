import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { handleApiRequest } from '../api/routes.js';
import type { AtlasComponentEntry, AtlasConfig, ResolvedAtlasConfig } from '../types/index.js';
import { resolveConfig } from './config.js';
import { discoverExamples } from './discovery.js';
import { getUiDir, loadVirtualModule, resolveVirtualModuleId } from './virtual-modules.js';

export default function atlas(userConfig: AtlasConfig = {}): Plugin[] {
	let config: ResolvedAtlasConfig;
	let root: string;
	let manifest: AtlasComponentEntry[] = [];
	const uiDir = getUiDir();

	async function rebuildManifest() {
		manifest = await discoverExamples(root, config);
	}

	const mainPlugin: Plugin = {
		name: 'atlas',
		enforce: 'pre',

		configResolved(resolved) {
			root = resolved.root;
			config = resolveConfig(userConfig, resolved);
		},

		async buildStart() {
			await rebuildManifest();
			if (manifest.length > 0) {
				console.log(`[atlas] Discovered ${manifest.length} component(s)`);
			}
		},

		configureServer(server: ViteDevServer) {
			server.watcher.on('add', async (file) => {
				const rel = path.relative(root, file);
				if (isExamplesFile(rel)) {
					await rebuildManifest();
					invalidateVirtualModules(server);
				}
			});

			server.watcher.on('unlink', async (file) => {
				const rel = path.relative(root, file);
				if (isExamplesFile(rel)) {
					await rebuildManifest();
					invalidateVirtualModules(server);
				}
			});

			server.middlewares.use(async (req, res, next) => {
				const url = req.url || '';
				const pathname = url.split('?')[0];

				if (!pathname.startsWith(config.route)) {
					return next();
				}

				const atlasPath = pathname.slice(config.route.length) || '/';

				if (atlasPath.startsWith('/api/')) {
					try {
						const handled = await handleApiRequest(req, res, atlasPath, manifest, root, config);
						if (handled) return;
					} catch (err) {
						console.error('[atlas] API error:', err);
						res.writeHead(500, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Internal server error' }));
						return;
					}
				}

				const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title}</title>
</head>
<body>
  <div id="atlas-root"></div>
  <script type="module" src="/@id/__x00__virtual:atlas-ui-entry"></script>
</body>
</html>`;

				const transformedHtml = await server.transformIndexHtml(pathname, html);
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(transformedHtml);
			});
		},

		resolveId(id) {
			return resolveVirtualModuleId(id, uiDir);
		},

		async load(id) {
			if (!id.startsWith('\0virtual:atlas-')) return;
			return loadVirtualModule(id, manifest, root, config);
		},

		async handleHotUpdate(ctx) {
			const rel = path.relative(root, ctx.file);
			if (!isExamplesFile(rel)) return;

			await rebuildManifest();

			const entry = manifest.find((e) => e.examplesFile === rel);
			if (!entry) return;

			const sourceModuleId = `\0virtual:atlas-source/${entry.slug}`;
			const propsModuleId = `\0virtual:atlas-props/${entry.slug}`;
			const manifestModuleId = '\0virtual:atlas-manifest';

			const modulesToInvalidate = [sourceModuleId, propsModuleId, manifestModuleId]
				.map((id) => ctx.server.moduleGraph.getModuleById(id))
				.filter(Boolean);

			for (const mod of modulesToInvalidate) {
				if (mod) {
					ctx.server.moduleGraph.invalidateModule(mod);
				}
			}

			// biome-ignore lint/suspicious/noExplicitAny: Vite's ModuleNode[] typing is complex
			return [...(ctx.modules || []), ...modulesToInvalidate.filter(Boolean)] as any;
		},
	};

	return [mainPlugin];
}

function isExamplesFile(relativePath: string): boolean {
	return /\.examples\.(tsx|jsx|ts|js)$/.test(relativePath);
}

function invalidateVirtualModules(server: ViteDevServer) {
	const manifestModule = server.moduleGraph.getModuleById('\0virtual:atlas-manifest');
	if (manifestModule) {
		server.moduleGraph.invalidateModule(manifestModule);
	}

	server.ws.send({ type: 'full-reload' });
}

export type { AtlasConfig } from '../types/index.js';
