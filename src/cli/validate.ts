import fs from 'node:fs/promises'
import ts from 'typescript'

interface ValidationError {
  message: string
}

/**
 * `atlas validate <filepath>` — Validate an examples file follows Atlas conventions.
 */
export async function runValidate(filePath: string): Promise<void> {
  const errors: ValidationError[] = []

  // Check 1: File exists and is readable
  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    process.stderr.write(`File not found or unreadable: ${filePath}\n`)
    process.exit(1)
    return
  }

  // Check 2: File has the .examples.{tsx,jsx,ts,js} extension
  if (!/\.examples\.(tsx|jsx|ts|js)$/.test(filePath)) {
    errors.push({
      message: `File does not have an .examples.{tsx,jsx,ts,js} extension`,
    })
  }

  // Parse the file
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const exportNames: string[] = []
  let hasDefaultExport = false

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined
    const isExported = modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    const isDefault = modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)

    if (isExported && isDefault) {
      hasDefaultExport = true
      continue
    }

    if (!isExported) continue

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text
          exportNames.push(name)

          // Check 4: Each named export is a function
          if (decl.initializer) {
            const init = unwrapCallExpression(decl.initializer)
            if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) {
              const _kind = ts.SyntaxKind[init.kind] || 'unknown'
              errors.push({
                message: `Export "${name}" is not a function (found: ${kindToLabel(init)})`,
              })
            }
          }

          // Check 5: PascalCase
          if (name[0] !== name[0].toUpperCase()) {
            const suggestion = name[0].toUpperCase() + name.slice(1)
            errors.push({
              message: `Export "${name}" should be PascalCase (suggestion: ${suggestion})`,
            })
          }
        }
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text
      exportNames.push(name)

      // Check 5: PascalCase
      if (name[0] !== name[0].toUpperCase()) {
        const suggestion = name[0].toUpperCase() + name.slice(1)
        errors.push({
          message: `Export "${name}" should be PascalCase (suggestion: ${suggestion})`,
        })
      }
    }
  }

  // Check for export default via `export default` statement
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      hasDefaultExport = true
    }
  }

  // Check 6: No default exports
  if (hasDefaultExport) {
    errors.push({ message: `Default exports are not allowed` })
  }

  // Check 3: At least one named export
  if (exportNames.length === 0) {
    errors.push({ message: `No named exports found` })
  }

  // Output results
  const basename = filePath.split('/').pop() || filePath

  if (errors.length === 0) {
    console.log(
      `✓ ${basename} — ${exportNames.length} export${exportNames.length === 1 ? '' : 's'}, all valid`,
    )
    process.exit(0)
  } else {
    console.log(`✗ ${basename}`)
    for (const err of errors) {
      console.log(`  - ${err.message}`)
    }
    process.exit(1)
  }
}

/**
 * Unwrap a call expression like `example(() => ..., { ... })` to get the inner function.
 */
function unwrapCallExpression(node: ts.Expression): ts.Expression {
  if (ts.isCallExpression(node)) {
    const firstArg = node.arguments[0]
    if (firstArg && (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg))) {
      return firstArg
    }
  }
  return node
}

/**
 * Get a human-readable label for a node kind.
 */
function kindToLabel(node: ts.Node): string {
  if (ts.isObjectLiteralExpression(node)) return 'object'
  if (ts.isArrayLiteralExpression(node)) return 'array'
  if (ts.isStringLiteral(node)) return 'string'
  if (ts.isNumericLiteral(node)) return 'number'
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword)
    return 'boolean'
  if (ts.isCallExpression(node)) return 'call expression'
  if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) return 'string'
  return 'expression'
}
