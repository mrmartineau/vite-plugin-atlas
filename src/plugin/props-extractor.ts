import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import type { AtlasProp } from '../types/index.js'

/**
 * Try to resolve a module specifier to an actual file path.
 */
async function resolveModulePath(
  specifier: string,
  fromDir: string,
): Promise<string | null> {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return null // Skip bare/node_modules specifiers
  }

  const resolved = path.resolve(fromDir, specifier)
  const extensions = ['.tsx', '.ts', '.jsx', '.js']

  // Try exact path
  for (const ext of extensions) {
    const candidate = resolved + ext
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // continue
    }
  }

  // Try with extension already present
  try {
    await fs.access(resolved)
    return resolved
  } catch {
    // continue
  }

  // Try index files
  for (const ext of extensions) {
    const candidate = path.join(resolved, `index${ext}`)
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // continue
    }
  }

  return null
}

/**
 * Parse a file's imports to find local import specifiers.
 */
function parseImports(
  content: string,
  filePath: string,
): Array<{ specifier: string; names: string[] }> {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  )

  const imports: Array<{ specifier: string; names: string[] }> = []

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text
      const names: string[] = []

      if (statement.importClause) {
        if (statement.importClause.name) {
          names.push(statement.importClause.name.text)
        }
        const bindings = statement.importClause.namedBindings
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            names.push(element.name.text)
          }
        }
      }

      imports.push({ specifier, names })
    }
  }

  return imports
}

/**
 * Find the component file by following imports from the examples file.
 */
async function findComponentFile(
  examplesFilePath: string,
  componentName: string,
  root: string,
): Promise<string | null> {
  const fullPath = path.resolve(root, examplesFilePath)
  const dir = path.dirname(fullPath)

  try {
    const content = await fs.readFile(fullPath, 'utf-8')
    const imports = parseImports(content, examplesFilePath)

    // Look for the component name in imports
    for (const imp of imports) {
      if (imp.names.includes(componentName)) {
        const resolved = await resolveModulePath(imp.specifier, dir)
        if (resolved) return resolved
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: look for sibling file
  const siblings = [
    path.join(dir, `${componentName}.tsx`),
    path.join(dir, `${componentName}.ts`),
    path.join(dir, `${componentName}.jsx`),
    path.join(dir, `${componentName}.js`),
    path.join(dir, componentName, 'index.tsx'),
    path.join(dir, componentName, 'index.ts'),
    path.join(dir, componentName, 'index.jsx'),
    path.join(dir, componentName, 'index.js'),
  ]

  for (const candidate of siblings) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // continue
    }
  }

  return null
}

/**
 * Extract JSDoc comment text from a node's leading comments.
 */
function getJSDocDescription(
  node: ts.Node,
  _sourceFile: ts.SourceFile,
): string {
  const jsdocs = ts.getJSDocCommentsAndTags(node)
  for (const jsdoc of jsdocs) {
    if (ts.isJSDoc(jsdoc) && jsdoc.comment) {
      if (typeof jsdoc.comment === 'string') {
        return jsdoc.comment
      }
      return jsdoc.comment
        .map((part) => part.text ?? '')
        .join('')
        .trim()
    }
  }
  return ''
}

/**
 * Extract the type string from a type node.
 */
function typeToString(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
): string {
  if (!typeNode) return 'unknown'
  return typeNode.getText(sourceFile)
}

/**
 * Extract props from a TypeScript interface or type alias.
 */
function extractPropsFromTypeMembers(
  members: ts.NodeArray<ts.TypeElement>,
  sourceFile: ts.SourceFile,
): AtlasProp[] {
  const props: AtlasProp[] = []

  for (const member of members) {
    if (ts.isPropertySignature(member) && member.name) {
      const name = member.name.getText(sourceFile)
      const type = typeToString(member.type, sourceFile)
      const required = !member.questionToken
      const description = getJSDocDescription(member, sourceFile)

      props.push({
        name,
        type,
        required,
        default: undefined,
        description,
      })
    }
  }

  return props
}

/**
 * Find and extract default values from destructuring patterns in function parameters.
 */
function extractDefaultValues(
  sourceFile: ts.SourceFile,
  componentName: string,
): Record<string, string> {
  const defaults: Record<string, string> = {}

  function visit(node: ts.Node) {
    // Look for function declarations/expressions/arrow functions
    const isTargetFunction =
      (ts.isFunctionDeclaration(node) && node.name?.text === componentName) ||
      (ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === componentName)

    if (isTargetFunction) {
      let params: ts.NodeArray<ts.ParameterDeclaration> | undefined

      if (ts.isFunctionDeclaration(node)) {
        params = node.parameters
      } else if (ts.isVariableDeclaration(node) && node.initializer) {
        if (
          ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)
        ) {
          params = node.initializer.parameters
        }
      }

      if (params && params.length > 0) {
        const firstParam = params[0]
        if (ts.isObjectBindingPattern(firstParam.name)) {
          for (const element of firstParam.name.elements) {
            if (
              ts.isBindingElement(element) &&
              element.initializer &&
              ts.isIdentifier(element.name)
            ) {
              defaults[element.name.text] =
                element.initializer.getText(sourceFile)
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return defaults
}

/**
 * Extract props from a component file using the TypeScript compiler API.
 */
export async function extractProps(
  examplesFilePath: string,
  componentName: string,
  root: string,
): Promise<AtlasProp[]> {
  const componentFile = await findComponentFile(
    examplesFilePath,
    componentName,
    root,
  )
  if (!componentFile) return []

  // Skip JS files without type annotations
  if (componentFile.endsWith('.js') || componentFile.endsWith('.jsx')) {
    return []
  }

  let content: string
  try {
    content = await fs.readFile(componentFile, 'utf-8')
  } catch {
    return []
  }

  const sourceFile = ts.createSourceFile(
    componentFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    componentFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  // Strategy 1: Look for an interface/type named `${ComponentName}Props`
  const propsTypeName = `${componentName}Props`

  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === propsTypeName
    ) {
      const props = extractPropsFromTypeMembers(statement.members, sourceFile)
      const defaults = extractDefaultValues(sourceFile, componentName)
      return props.map((p) => ({
        ...p,
        default: defaults[p.name] ?? p.default,
      }))
    }

    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === propsTypeName &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      const props = extractPropsFromTypeMembers(
        statement.type.members,
        sourceFile,
      )
      const defaults = extractDefaultValues(sourceFile, componentName)
      return props.map((p) => ({
        ...p,
        default: defaults[p.name] ?? p.default,
      }))
    }
  }

  // Strategy 2: Look for the function component and get its first parameter type
  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined
    const isExported = modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    )

    if (!isExported) continue

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === componentName
    ) {
      const firstParam = statement.parameters[0]
      if (firstParam?.type && ts.isTypeLiteralNode(firstParam.type)) {
        const props = extractPropsFromTypeMembers(
          firstParam.type.members,
          sourceFile,
        )
        const defaults = extractDefaultValues(sourceFile, componentName)
        return props.map((p) => ({
          ...p,
          default: defaults[p.name] ?? p.default,
        }))
      }
      if (firstParam?.type && ts.isTypeReferenceNode(firstParam.type)) {
        // Resolve the type reference
        const typeName = firstParam.type.typeName.getText(sourceFile)
        for (const stmt of sourceFile.statements) {
          if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === typeName) {
            const props = extractPropsFromTypeMembers(stmt.members, sourceFile)
            const defaults = extractDefaultValues(sourceFile, componentName)
            return props.map((p) => ({
              ...p,
              default: defaults[p.name] ?? p.default,
            }))
          }
          if (
            ts.isTypeAliasDeclaration(stmt) &&
            stmt.name.text === typeName &&
            ts.isTypeLiteralNode(stmt.type)
          ) {
            const props = extractPropsFromTypeMembers(
              stmt.type.members,
              sourceFile,
            )
            const defaults = extractDefaultValues(sourceFile, componentName)
            return props.map((p) => ({
              ...p,
              default: defaults[p.name] ?? p.default,
            }))
          }
        }
      }
    }

    // Check variable declarations for arrow/function components
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === componentName &&
          decl.initializer
        ) {
          const init = decl.initializer
          let params: ts.NodeArray<ts.ParameterDeclaration> | undefined

          if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
            params = init.parameters
          }

          if (params && params.length > 0) {
            const firstParam = params[0]
            if (firstParam.type && ts.isTypeLiteralNode(firstParam.type)) {
              const props = extractPropsFromTypeMembers(
                firstParam.type.members,
                sourceFile,
              )
              const defaults = extractDefaultValues(sourceFile, componentName)
              return props.map((p) => ({
                ...p,
                default: defaults[p.name] ?? p.default,
              }))
            }
            if (firstParam.type && ts.isTypeReferenceNode(firstParam.type)) {
              const typeName = firstParam.type.typeName.getText(sourceFile)
              for (const stmt of sourceFile.statements) {
                if (
                  ts.isInterfaceDeclaration(stmt) &&
                  stmt.name.text === typeName
                ) {
                  const props = extractPropsFromTypeMembers(
                    stmt.members,
                    sourceFile,
                  )
                  const defaults = extractDefaultValues(
                    sourceFile,
                    componentName,
                  )
                  return props.map((p) => ({
                    ...p,
                    default: defaults[p.name] ?? p.default,
                  }))
                }
                if (
                  ts.isTypeAliasDeclaration(stmt) &&
                  stmt.name.text === typeName &&
                  ts.isTypeLiteralNode(stmt.type)
                ) {
                  const props = extractPropsFromTypeMembers(
                    stmt.type.members,
                    sourceFile,
                  )
                  const defaults = extractDefaultValues(
                    sourceFile,
                    componentName,
                  )
                  return props.map((p) => ({
                    ...p,
                    default: defaults[p.name] ?? p.default,
                  }))
                }
              }
            }
          }
        }
      }
    }
  }

  // Strategy 3: Look for any `Props` type in the file
  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === 'Props'
    ) {
      const props = extractPropsFromTypeMembers(statement.members, sourceFile)
      const defaults = extractDefaultValues(sourceFile, componentName)
      return props.map((p) => ({
        ...p,
        default: defaults[p.name] ?? p.default,
      }))
    }
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === 'Props' &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      const props = extractPropsFromTypeMembers(
        statement.type.members,
        sourceFile,
      )
      const defaults = extractDefaultValues(sourceFile, componentName)
      return props.map((p) => ({
        ...p,
        default: defaults[p.name] ?? p.default,
      }))
    }
  }

  return []
}
