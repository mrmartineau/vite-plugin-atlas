export function deCamelCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase())
}
