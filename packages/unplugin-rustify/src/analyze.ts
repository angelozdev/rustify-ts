/**
 * Decides where a `site` argument may be injected. It works on Babel paths and
 * knows nothing about bundlers or source text, so the bundler driver and the
 * Babel driver share exactly the same rules.
 *
 * The guiding rule: a false positive is forbidden, a false negative is fine. A
 * call is only rewritten when its callee resolves, through real scope bindings,
 * to an import of rustify-ts.
 */
import type { NodePath, Visitor } from '@babel/traverse'
import type * as t from '@babel/types'
import { FREE_SITES, MODULE_NAME } from './targets'

export type Injection = {
  readonly name: string
  readonly line: number
  readonly insertAt: number
  readonly path: NodePath<t.CallExpression>
}

type AnyPath = NodePath<t.Node>

/**
 * Sheds the wrappers that carry no runtime meaning — `as`, `satisfies`, `!` and
 * parentheses — so `(ok(1) as Outcome<number, never>).map(f)` reads like
 * `ok(1).map(f)`. The cast is the price of `NodePath#get` widening its result to
 * `NodePath<Node> | NodePath<Node>[]` over a union of node types; every branch
 * here is a node whose `expression` is a single expression.
 */
function unwrap(path: AnyPath): AnyPath {
  let current: AnyPath = path
  while (
    current.isTSAsExpression() ||
    current.isTSSatisfiesExpression() ||
    current.isTSNonNullExpression() ||
    current.isParenthesizedExpression()
  ) {
    current = current.get('expression') as AnyPath
  }
  return current
}

function propertyName(path: AnyPath): string | undefined {
  if (!path.isMemberExpression() || path.node.computed) return undefined
  const property = path.node.property
  return property.type === 'Identifier' ? property.name : undefined
}

/**
 * The name this expression has inside the rustify-ts module, or undefined when
 * it does not come from there. A namespace import answers `*`, so `R.fail`
 * reads as `fail` and `R.V.struct` as `V.struct`.
 */
function importedName(raw: AnyPath): string | undefined {
  const path = unwrap(raw)
  if (path.isIdentifier()) {
    const binding = path.scope.getBinding(path.node.name)
    if (binding === undefined || binding.kind !== 'module') return undefined
    const specifier = binding.path
    const declaration = specifier.parentPath
    if (declaration === null || !declaration.isImportDeclaration()) return undefined
    if (declaration.node.source.value !== MODULE_NAME) return undefined
    if (specifier.isImportNamespaceSpecifier()) return '*'
    if (specifier.isImportSpecifier() && specifier.node.imported.type === 'Identifier') {
      return specifier.node.imported.name
    }
    return undefined
  }
  const property = propertyName(path)
  if (property === undefined || !path.isMemberExpression()) return undefined
  const object = importedName(path.get('object'))
  if (object === '*') return property
  if (object === 'V') return `V.${property}`
  return undefined
}

function target(path: NodePath<t.CallExpression>): { name: string; index: number } | undefined {
  const callee = unwrap(path.get('callee'))
  const free = importedName(callee)
  if (free === undefined) return undefined
  const index = FREE_SITES[free]
  return index === undefined ? undefined : { name: free, index }
}

function anchorLine(path: NodePath<t.CallExpression>): number | undefined {
  const callee = unwrap(path.get('callee'))
  const node = callee.isMemberExpression() && !callee.node.computed ? callee.node.property : callee.node
  return node.loc?.start.line
}

/**
 * A fresh visitor per file: it holds no state of its own, and every decision is
 * taken from the scope of the path it is handed. A call is left alone unless it
 * carries exactly the arguments that precede the site, so a hand-written site
 * survives and a spread — whose arity is unknown — is never touched.
 */
export function createVisitor(report: (injection: Injection) => void): Visitor {
  return {
    CallExpression(path) {
      const found = target(path)
      if (found === undefined) return
      const args = path.node.arguments
      if (args.length !== found.index) return
      if (args.some((argument) => argument.type === 'SpreadElement')) return
      const insertAt = args[args.length - 1]?.end
      const line = anchorLine(path)
      if (insertAt === null || insertAt === undefined || line === undefined) return
      report({ name: found.name, line, insertAt, path })
    },
  }
}
