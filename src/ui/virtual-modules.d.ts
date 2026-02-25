declare module 'virtual:atlas-manifest' {
	import type { AtlasComponentEntry } from '../types/index.js';
	export const manifest: AtlasComponentEntry[];
}

declare module 'virtual:atlas-config' {
	export const config: { route: string; title: string; wrapper: string | null };
}

declare module 'virtual:atlas-source/*' {
	export const sources: Record<string, string>;
	export const imports: string;
}

declare module 'virtual:atlas-props/*' {
	import type { AtlasProp } from '../types/index.js';
	export const props: AtlasProp[];
}
