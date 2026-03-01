import type { AtlasConfig, ResolvedAtlasConfig } from '../types/index.js'

const COMMON_ALIAS_KEYS = ['@/', '@components/', '~/', '@src/']

// biome-ignore lint/suspicious/noExplicitAny: Vite's ResolvedConfig has complex alias types
export function resolveConfig(
  userConfig: AtlasConfig = {},
  viteConfig?: any,
): ResolvedAtlasConfig {
  const pattern = userConfig.pattern
    ? Array.isArray(userConfig.pattern)
      ? userConfig.pattern
      : [userConfig.pattern]
    : ['**/*.examples.{tsx,jsx,ts,js}']

  let route = userConfig.route ?? '/_atlas'
  if (!route.startsWith('/')) route = `/${route}`
  if (route.endsWith('/') && route.length > 1) route = route.slice(0, -1)

  const title = userConfig.title ?? 'Atlas'

  const ignore = userConfig.ignore ?? ['**/node_modules/**']

  const wrapper = userConfig.wrapper ?? null

  let importPrefix: string | null = userConfig.importPrefix ?? null

  if (importPrefix === null && viteConfig?.resolve?.alias) {
    const alias = viteConfig.resolve.alias

    if (Array.isArray(alias)) {
      for (const entry of alias) {
        const key = typeof entry.find === 'string' ? entry.find : undefined
        if (
          key &&
          COMMON_ALIAS_KEYS.some((k) => key === k || key === k.slice(0, -1))
        ) {
          importPrefix = key
          break
        }
      }
    } else if (typeof alias === 'object') {
      for (const key of Object.keys(alias)) {
        if (
          COMMON_ALIAS_KEYS.some((k) => key === k || key === k.slice(0, -1))
        ) {
          importPrefix = key
          break
        }
      }
    }
  }

  const importPackage = userConfig.importPackage ?? null

  return { pattern, route, title, ignore, wrapper, importPrefix, importPackage }
}
